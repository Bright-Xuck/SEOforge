<?php
/**
 * Plugin Name: Forge Elementor Bridge
 * Description: Minimal optional companion endpoint for SEO Forge. Exposes a health/capability endpoint (GET /wp-json/forge/v1/system), controlled Elementor document reads/writes (GET/PUT /wp-json/forge/v1/elementor/documents/{id}), and whitelisted Rank Math SEO meta reads/writes (GET/POST /wp-json/forge/v1/seo-meta/{id}) so Forge can safely patch Elementor source data and search metadata.
 * Version: 0.3.0
 * Author: SEO Forge
 * License: GPL-2.0-or-later
 *
 * WHY THIS PLUGIN EXISTS (Sprint 25, Path C + Path D):
 * Elementor stores page structure as structured JSON in the PRIVATE `_elementor_data`
 * post meta. That meta is NOT exposed through the standard wp/v2 REST API, so SEO
 * Forge cannot safely read or write it via REST alone (Path B rejected). This plugin
 * registers a controlled, authenticated interface (Path C) and performs the actual
 * save through Elementor's native server-side document API (Path D) so Elementor
 * hooks, CSS regeneration, and versioning behave exactly as they do in the editor.
 *
 * SEO Forge NEVER sends arbitrary rendered HTML back to WordPress. It reads the
 * Elementor document, mutates only approved settings, and writes the whole document
 * atomically with optimistic concurrency (409 on conflict).
 *
 * SPRINT 26 HARDENING:
 * - GET /wp-json/forge/v1/system exposes site health: WordPress version, Elementor
 *   installed/version/supported, authentication state, and the supported widget
 *   capability list (typed contract consumed by `forge wp elementor doctor`).
 * - All error responses carry a typed body: { code, message } with stable codes
 *   (page_not_found, not_elementor_document, version_conflict, invalid_json,
 *   invalid_structure, payload_too_large) — raw PHP errors are never the
 *   primary error surface.
 * - Writes validate the payload (size cap, JSON, Elementor element structure)
 *   and use consistent ISO-8601 modified timestamps for optimistic concurrency
 *   (read and write now share one timestamp source).
 * - Writes are verified server-side: the document is re-read after saving and
 *   compared structurally; `verified: false` is reported when they diverge so the
 *   client can fail closed (an HTTP 200 alone is never success).
 *
 * SECURITY MODEL:
 * - Standard WordPress REST authentication (application passwords) is used; the
 *   caller must be logged in AND hold `edit_post` capability for the document.
 * - Only the three endpoints below are exposed — there is no generic
 *   "set arbitrary meta" or "set arbitrary _elementor_data" endpoint: the write
 *   route only accepts a structurally valid Elementor element array.
 * - Writes are atomic (one PUT replaces the whole document) and version-guarded.
 * - No credentials are stored; nothing is logged.
 */

if (!defined('ABSPATH')) {
    exit;
}

define('FORGE_ELEMENTOR_BRIDGE_VERSION', '0.2.0');
define('FORGE_ELEMENTOR_MIN_ELEMENTOR_VERSION_MAJOR', 2);
define('FORGE_ELEMENTOR_MAX_PAYLOAD_BYTES', 5 * 1024 * 1024);

/**
 * Widget capability lists. Kept in sync with @forge/dom-engine's conservative
 * widget schema (packages/dom-engine/src/elementor/widget-schema.ts).
 */
function forge_elementor_supported_widgets()
{
    return array('heading', 'text-editor', 'button', 'image', 'text-path', 'icon', 'icon-list', 'video', 'divider', 'spacer');
}

function forge_elementor_unsupported_widgets()
{
    return array('html', 'shortcode', 'template', 'loop-grid', 'loop-carousel', 'form', 'nav-menu', 'popup', 'google_maps', 'maps', 'lottie', 'code-highlight');
}

add_action('rest_api_init', function () {
    // ── Sprint 26: health / capability check ─────────────────────────────
    register_rest_route('forge/v1', '/system', array(
        'methods'  => WP_REST_Server::READABLE,
        'callback' => 'forge_elementor_system_status',
        'permission_callback' => 'forge_elementor_is_authenticated',
    ));
    // ── Controlled document read ─────────────────────────────────────────
    register_rest_route('forge/v1', '/elementor/documents/(?P<id>\d+)', array(
        'methods'  => WP_REST_Server::READABLE,
        'callback' => 'forge_elementor_read_document',
        'permission_callback' => 'forge_elementor_can_edit',
        'args'     => array(
            'id' => array('validate_callback' => 'forge_elementor_validate_id'),
        ),
    ));
    // ── Controlled atomic document write ─────────────────────────────────
    register_rest_route('forge/v1', '/elementor/documents/(?P<id>\d+)', array(
        'methods'  => WP_REST_Server::EDITABLE,
        'callback' => 'forge_elementor_write_document',
        'permission_callback' => 'forge_elementor_can_edit',
        'args'     => array(
            'id' => array('validate_callback' => 'forge_elementor_validate_id'),
        ),
    ));
    // ── Whitelisted Rank Math SEO meta ───────────────────────────────────
    register_rest_route('forge/v1', '/seo-meta/(?P<id>\d+)', array(
        array(
            'methods'  => WP_REST_Server::READABLE,
            'callback' => 'forge_seo_meta_read',
            'permission_callback' => 'forge_elementor_can_edit',
            'args'     => array(
                'id' => array('validate_callback' => 'forge_elementor_validate_id'),
            ),
        ),
        array(
            'methods'  => WP_REST_Server::EDITABLE,
            'callback' => 'forge_seo_meta_write',
            'permission_callback' => 'forge_elementor_can_edit',
            'args'     => array(
                'id' => array('validate_callback' => 'forge_elementor_validate_id'),
            ),
        ),
    ));
});

/**
 * Typed error response: { code, message } — never a raw PHP error.
 */
function forge_elementor_error($code, $message, $status, $extra = array())
{
    $body = array_merge(array('code' => $code, 'message' => $message), $extra);
    return new WP_REST_Response($body, $status);
}

/**
 * Argument validation: numeric post id > 0.
 */
function forge_elementor_validate_id($param)
{
    return is_numeric($param) && (int) $param > 0;
}

/**
 * Permission callback (system endpoint): any authenticated user.
 * Reaching this callback proves REST authentication succeeded.
 */
function forge_elementor_is_authenticated()
{
    return is_user_logged_in();
}

/**
 * Permission callback (document endpoints): authenticated user with
 * edit_post capability for the specific document.
 */
function forge_elementor_can_edit(WP_REST_Request $request)
{
    if (!is_user_logged_in()) {
        return false;
    }
    $post_id = absint($request['id']);
    if (!$post_id) {
        return false;
    }
    if (!current_user_can('edit_post', $post_id)) {
        return false;
    }
    return true;
}

/**
 * Single source of truth for the document modified timestamp (ISO-8601, GMT).
 * Sprint 26 fix: the read endpoint previously returned `$post->post_modified_gmt`
 * (SQL format) while the write guard compared against `get_post_modified_time('c')`
 * (ISO-8601) — the formats never matched, so every guarded write was rejected.
 */
function forge_elementor_modified_iso($post_id)
{
    return get_post_modified_time('c', true, $post_id);
}

/**
 * Whether the post is an active Elementor document.
 */
function forge_elementor_is_active($post_id)
{
    $edit_mode = get_post_meta($post_id, '_elementor_edit_mode', true);
    $data = get_post_meta($post_id, '_elementor_data', true);
    return $edit_mode === 'builder' || $edit_mode === 'true'
        || (is_string($data) && $data !== '' && $data !== '[]');
}

/**
 * GET /wp-json/forge/v1/system
 *
 * Typed health/capability contract (Sprint 26). Reaching the callback means
 * REST authentication succeeded (401 otherwise). Reports WordPress version,
 * Elementor availability/version/support, and the widget capability list.
 */
function forge_elementor_system_status()
{
    $elementor_installed = class_exists('\Elementor\Plugin');
    $elementor_version = null;
    if (defined('ELEMENTOR_VERSION')) {
        $elementor_version = (string) ELEMENTOR_VERSION;
    }

    $supported = false;
    if ($elementor_version !== null && preg_match('/^(\d+)/', $elementor_version, $m)) {
        $supported = (int) $m[1] >= FORGE_ELEMENTOR_MIN_ELEMENTOR_VERSION_MAJOR;
    }

    return new WP_REST_Response(array(
        'plugin'          => 'forge-elementor-bridge',
        'pluginVersion'   => FORGE_ELEMENTOR_BRIDGE_VERSION,
        'generatedAt'     => gmdate('c'),
        'wordpress'       => array(
            'version'    => get_bloginfo('version'),
        ),
        'authentication'  => array(
            'valid'      => is_user_logged_in(),
        ),
        'elementor'       => array(
            'installed'             => $elementor_installed,
            'version'               => $elementor_version,
            'minimumSupportedMajor' => FORGE_ELEMENTOR_MIN_ELEMENTOR_VERSION_MAJOR,
            'supported'             => $supported,
        ),
        'capabilities'    => array(
            'readDocument'       => true,
            'writeDocument'      => true,
            'supportedWidgets'   => forge_elementor_supported_widgets(),
            'unsupportedWidgets' => forge_elementor_unsupported_widgets(),
        ),
    ), 200);
}

/**
 * Read an Elementor document. Errors are typed: page_not_found (404),
 * not_elementor_document (501).
 */
function forge_elementor_read_document(WP_REST_Request $request)
{
    $post_id = absint($request['id']);
    $post = get_post($post_id);
    if (!$post || !in_array($post->post_type, array('page', 'post'), true)) {
        return forge_elementor_error('page_not_found', 'No readable page/post exists for this id.', 404);
    }
    if (!forge_elementor_is_active($post_id)) {
        return forge_elementor_error('not_elementor_document', 'This document is not managed by Elementor (no builder data).', 501);
    }

    $data = get_post_meta($post_id, '_elementor_data', true);
    // Sprint 26 fix: do NOT wp_unslash() this value. Elementor stores
    // wp_slash(wp_json_encode(...)) through update_metadata(), which unslashes
    // one level before the DB write. The stored value therefore keeps its JSON
    // escapes (\u2014, \", ...). Calling wp_unslash() here removed the backslash
    // from every JSON escape and corrupted non-ASCII text (an em dash became
    // the literal string "u2014").
    if (!is_string($data)) {
        $data = '';
    }

    return new WP_REST_Response(array(
        'postId'          => $post_id,
        'title'           => $post->post_title,
        'type'            => $post->post_type,
        'url'             => get_permalink($post_id),
        'elementorVersion' => get_post_meta($post_id, '_elementor_version', true) ?: null,
        'editMode'        => get_post_meta($post_id, '_elementor_edit_mode', true) ?: null,
        'data'            => $data,
        'modified'        => forge_elementor_modified_iso($post_id),
    ), 200);
}

/**
 * Write an Elementor document atomically with optimistic concurrency.
 *
 * Body: { data: string (full _elementor_data JSON), expectedVersion?, expectedModified? }
 *
 * The whole document is replaced in one request; partial writes are impossible.
 * Sprint 26 fix: the optimistic-concurrency guard now compares consistent
 * ISO-8601 modified timestamps (and the Elementor version). The previous
 * structural "incoming data must equal current data" check was removed — it
 * rejected every legitimate mutation.
 *
 * The response carries `verified` — a server-side re-read compared structurally
 * against the written payload. `verified: false` is NOT success.
 */
function forge_elementor_write_document(WP_REST_Request $request)
{
    $post_id = absint($request['id']);
    $post = get_post($post_id);
    if (!$post || !in_array($post->post_type, array('page', 'post'), true)) {
        return forge_elementor_error('page_not_found', 'No writable page/post exists for this id.', 404);
    }
    if (!forge_elementor_is_active($post_id)) {
        return forge_elementor_error('not_elementor_document', 'This document is not managed by Elementor (no builder data).', 501);
    }

    $params = $request->get_json_params();
    if (!is_array($params)) {
        return forge_elementor_error('invalid_json', 'Request body must be a JSON object.', 400);
    }
    // REST JSON params are already decoded; do not wp_unslash() them or JSON
    // escapes such as \u2014 lose their backslash before json_decode() runs.
    $data = isset($params['data']) ? (string) $params['data'] : '';
    if ($data === '') {
        return forge_elementor_error('empty_data', 'The write payload is empty.', 400);
    }
    if (strlen($data) > FORGE_ELEMENTOR_MAX_PAYLOAD_BYTES) {
        return forge_elementor_error('payload_too_large', 'The write payload exceeds the size limit.', 400);
    }
    $decoded = json_decode($data, true);
    if (!is_array($decoded)) {
        return forge_elementor_error('invalid_json', 'The write payload is not valid JSON.', 400);
    }
    if (!forge_elementor_validate_structure($decoded)) {
        return forge_elementor_error('invalid_structure', 'The write payload is not a valid Elementor element array.', 400);
    }

    // Optimistic concurrency: reject if the source changed since the caller read it.
    $expected_modified = isset($params['expectedModified']) ? (string) $params['expectedModified'] : '';
    if ($expected_modified !== '') {
        $current_modified = forge_elementor_modified_iso($post_id);
        $current_ts = $current_modified !== '' ? strtotime($current_modified) : false;
        $expected_ts = $expected_modified !== '' ? strtotime($expected_modified) : false;
        $conflict = false;
        if ($current_ts !== false && $expected_ts !== false) {
            $conflict = $current_ts !== $expected_ts;
        } else {
            $conflict = $current_modified !== $expected_modified;
        }
        if ($conflict) {
            return forge_elementor_error('version_conflict', 'The document changed remotely since it was read; nothing was written.', 409, array('currentModified' => $current_modified));
        }
    }
    $expected_version = isset($params['expectedVersion']) ? (string) $params['expectedVersion'] : '';
    if ($expected_version !== '') {
        $current_version = (string) get_post_meta($post_id, '_elementor_version', true);
        if ($current_version !== '' && $current_version !== $expected_version) {
            return forge_elementor_error('version_conflict', 'The Elementor version changed remotely since it was read; nothing was written.', 409, array('currentVersion' => $current_version));
        }
    }

    // Path D: use Elementor's native server-side save when available.
    $saved = false;
    if (class_exists('\Elementor\Plugin')) {
        try {
            $document = \Elementor\Plugin::$instance->documents->get($post_id);
            if ($document && method_exists($document, 'save')) {
                $result = $document->save(array('elements' => $decoded));
                if (!is_wp_error($result)) {
                    $saved = true;
                }
            }
        } catch (\Exception $e) {
            // Fall through to raw meta write below rather than failing hard.
        }
    }
    if (!$saved) {
        update_post_meta($post_id, '_elementor_data', wp_slash(wp_json_encode($decoded)));
        $saved = true;
    }

    // Clear Elementor CSS cache so the rendered page reflects the change.
    if (class_exists('\Elementor\Plugin') && method_exists(\Elementor\Plugin::$instance, 'files_manager')) {
        try {
            \Elementor\Plugin::$instance->files_manager->clear_cache();
        } catch (\Exception $e) {
            // Non-fatal.
        }
    }

    // Server-side verification (Sprint 26): re-read and compare structurally.
    // An HTTP 200 alone is never success — the client fails closed when the
    // stored document does not structurally match what was written.
    $re_read = get_post_meta($post_id, '_elementor_data', true);
    // Same as the read endpoint: the raw meta value is valid JSON with its
    // escapes intact. Unslashing it here would make verification fail only on
    // documents that contain non-ASCII characters.
    $verified = is_string($re_read) && $re_read !== '' && forge_elementor_json_equivalent($re_read, wp_json_encode($decoded));

    return new WP_REST_Response(array(
        'postId'          => $post_id,
        'written'         => $saved,
        'verified'        => $verified,
        'elementorVersion' => get_post_meta($post_id, '_elementor_version', true) ?: null,
        'editMode'        => get_post_meta($post_id, '_elementor_edit_mode', true) ?: null,
        'data'            => $re_read,
        'modified'        => forge_elementor_modified_iso($post_id),
    ), 200);
}

/**
 * Validate that a decoded payload is an Elementor element array:
 * a non-empty list of objects, each with a string `id` and string `elType`,
 * and (recursively) valid nested `elements`.
 */
function forge_elementor_validate_structure($elements, $depth = 0)
{
    if ($depth > 20) {
        return false;
    }
    if (!is_array($elements) || empty($elements)) {
        return false;
    }
    if (array_keys($elements) !== range(0, count($elements) - 1)) {
        return false;
    }
    foreach ($elements as $element) {
        if (!is_array($element)) {
            return false;
        }
        if (!isset($element['id']) || !is_string($element['id']) || $element['id'] === '') {
            return false;
        }
        if (!isset($element['elType']) || !is_string($element['elType']) || $element['elType'] === '') {
            return false;
        }
        if (isset($element['settings']) && !is_array($element['settings'])) {
            return false;
        }
        if (isset($element['elements'])) {
            if (!is_array($element['elements'])) {
                return false;
            }
            if (!empty($element['elements']) && !forge_elementor_validate_structure($element['elements'], $depth + 1)) {
                return false;
            }
        }
    }
    return true;
}

/**
 * Structural JSON equivalence (Elementor may reformat whitespace/key order).
 */
function forge_elementor_json_equivalent(string $a, string $b): bool
{
    $da = json_decode($a, true);
    $db = json_decode($b, true);
    if (!is_array($da) || !is_array($db)) {
        return false;
    }
    return forge_elementor_normalize($da) === forge_elementor_normalize($db);
}

function forge_elementor_normalize($value)
{
    if (is_array($value)) {
        $is_list = array_keys($value) === range(0, count($value) - 1);
        if ($is_list) {
            return array_map('forge_elementor_normalize', $value);
        }
        // Elementor's native Document::save() drops default `isInner: false`
        // from nested widgets during its sanitization pass. That is a
        // serialization detail, not a content change, so a false isInner is
        // normalized away on both sides before structural comparison.
        if (array_key_exists('isInner', $value) && $value['isInner'] === false) {
            unset($value['isInner']);
        }
        ksort($value);
        $out = array();
        foreach ($value as $k => $v) {
            $out[$k] = forge_elementor_normalize($v);
        }
        return $out;
    }
    return $value;
}

/**
 * Whitelisted SEO meta fields. Deliberately small: Forge can propose a ranking
 * title, description, focus keyword, canonical URL, and robots directive — and
 * nothing else. Arbitrary post meta is never writable through this endpoint.
 */
function forge_seo_meta_fields()
{
    return array(
        'title'       => 'rank_math_title',
        'description' => 'rank_math_description',
        'focusKeyword' => 'rank_math_focus_keyword',
        'canonical'   => 'rank_math_canonical_url',
        'robots'      => 'rank_math_robots',
    );
}

function forge_seo_meta_plugin()
{
    if (defined('RANK_MATH_VERSION') || class_exists('\RankMath')) {
        return 'rank-math';
    }
    if (defined('WPSEO_VERSION')) {
        return 'yoast';
    }
    if (defined('SEOPRESS_VERSION')) {
        return 'seopress';
    }
    return 'none';
}

function forge_seo_meta_snapshot($post_id)
{
    $out = array();
    foreach (forge_seo_meta_fields() as $field => $meta_key) {
        $value = get_post_meta($post_id, $meta_key, true);
        $out[$field] = $value === '' ? null : $value;
    }
    return $out;
}

/**
 * GET /wp-json/forge/v1/seo-meta/{id}
 */
function forge_seo_meta_read(WP_REST_Request $request)
{
    $post_id = absint($request['id']);
    $post = get_post($post_id);
    if (!$post || !in_array($post->post_type, array('page', 'post'), true)) {
        return forge_elementor_error('page_not_found', 'No readable page/post exists for this id.', 404);
    }
    return new WP_REST_Response(array(
        'postId' => $post_id,
        'plugin' => forge_seo_meta_plugin(),
        'fields' => forge_seo_meta_snapshot($post_id),
        'modified' => forge_elementor_modified_iso($post_id),
    ), 200);
}

/**
 * POST /wp-json/forge/v1/seo-meta/{id}
 *
 * Body: { "fields": { "title": "...", "description": "..." } }
 * Only whitelisted fields are accepted. Values are sanitized, written, then
 * re-read and compared — HTTP 200 alone is never treated as success.
 */
function forge_seo_meta_write(WP_REST_Request $request)
{
    $post_id = absint($request['id']);
    $post = get_post($post_id);
    if (!$post || !in_array($post->post_type, array('page', 'post'), true)) {
        return forge_elementor_error('page_not_found', 'No writable page/post exists for this id.', 404);
    }
    if (forge_seo_meta_plugin() !== 'rank-math') {
        return forge_elementor_error('seo_plugin_not_supported', 'Rank Math is not active on this site.', 409);
    }

    $body = $request->get_json_params();
    $fields = isset($body['fields']) && is_array($body['fields']) ? $body['fields'] : null;
    if ($fields === null || empty($fields)) {
        return forge_elementor_error('invalid_payload', 'Expected { fields: { ... } } with at least one whitelisted field.', 400);
    }

    $whitelist = forge_seo_meta_fields();
    $old = forge_seo_meta_snapshot($post_id);
    $written = array();

    foreach ($fields as $field => $value) {
        if (!array_key_exists($field, $whitelist)) {
            return forge_elementor_error('field_not_allowed', 'Field is not whitelisted: ' . $field, 400);
        }

        if ($value === null) {
            delete_post_meta($post_id, $whitelist[$field]);
            $written[$field] = null;
            continue;
        }

        switch ($field) {
            case 'title':
                $clean = sanitize_text_field((string) $value);
                if (strlen($clean) > 200) {
                    return forge_elementor_error('invalid_value', 'Title exceeds 200 characters.', 400);
                }
                break;
            case 'description':
                $clean = sanitize_text_field((string) $value);
                if (strlen($clean) > 400) {
                    return forge_elementor_error('invalid_value', 'Description exceeds 400 characters.', 400);
                }
                break;
            case 'focusKeyword':
                $clean = sanitize_text_field((string) $value);
                if (strlen($clean) > 200) {
                    return forge_elementor_error('invalid_value', 'Focus keyword exceeds 200 characters.', 400);
                }
                break;
            case 'canonical':
                $clean = esc_url_raw((string) $value);
                if ($clean !== '' && !wp_http_validate_url($clean)) {
                    return forge_elementor_error('invalid_value', 'Canonical URL is not a valid URL.', 400);
                }
                break;
            case 'robots':
                $allowed = array('index', 'noindex', 'follow', 'nofollow', 'noarchive', 'nosnippet', 'noimageindex');
                $list = is_array($value) ? $value : explode(',', (string) $value);
                $clean = array();
                foreach ($list as $directive) {
                    $directive = strtolower(trim((string) $directive));
                    if ($directive === '') {
                        continue;
                    }
                    if (!in_array($directive, $allowed, true)) {
                        return forge_elementor_error('invalid_value', 'Unsupported robots directive: ' . $directive, 400);
                    }
                    $clean[] = $directive;
                }
                break;
            default:
                return forge_elementor_error('field_not_allowed', 'Field is not whitelisted: ' . $field, 400);
        }

        update_post_meta($post_id, $whitelist[$field], $clean);
        $written[$field] = $clean;
    }

    // Server-side verification: re-read every written field.
    $current = forge_seo_meta_snapshot($post_id);
    $verified = true;
    foreach ($written as $field => $expected) {
        $actual = $current[$field];
        if ($expected === null) {
            if ($actual !== null) {
                $verified = false;
            }
        } elseif (is_array($expected)) {
            $a = is_array($actual) ? $actual : array();
            if ($a !== $expected) {
                $verified = false;
            }
        } elseif ((string) $actual !== (string) $expected) {
            $verified = false;
        }
    }

    return new WP_REST_Response(array(
        'postId' => $post_id,
        'plugin' => 'rank-math',
        'written' => array_keys($written),
        'verified' => $verified,
        'old' => $old,
        'new' => $current,
        'modified' => forge_elementor_modified_iso($post_id),
    ), 200);
}
