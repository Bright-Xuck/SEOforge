<?php
/**
 * Plugin Name: Forge Elementor Bridge
 * Description: Minimal optional companion endpoint for SEO Forge. Exposes controlled Elementor document reads/writes (GET/PUT /wp-json/forge/v1/elementor/documents/{id}) so Forge can safely patch Elementor source data.
 * Version: 0.1.0
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
 * SECURITY MODEL:
 * - Standard WordPress REST authentication (application passwords) is used.
 * - The caller must be logged in AND hold `edit_post` capability for the document.
 * - Writes are atomic (one PUT replaces the whole document) and version-guarded.
 * - No credentials are stored; no unauthenticated access is granted.
 */

if (!defined('ABSPATH')) {
    exit;
}

add_action('rest_api_init', function () {
    register_rest_route('forge/v1', '/elementor/documents/(?P<id>\d+)', array(
        'methods'  => WP_REST_Server::READABLE,
        'callback' => 'forge_elementor_read_document',
        'permission_callback' => 'forge_elementor_can_edit',
        'args'     => array(
            'id' => array('validate_callback' => 'absint'),
        ),
    ));
    register_rest_route('forge/v1', '/elementor/documents/(?P<id>\d+)', array(
        'methods'  => WP_REST_Server::EDITABLE,
        'callback' => 'forge_elementor_write_document',
        'permission_callback' => 'forge_elementor_can_edit',
        'args'     => array(
            'id' => array('validate_callback' => 'absint'),
        ),
    ));
});

/**
 * Permission callback: authenticated user with edit_post capability.
 */
function forge_elementor_can_edit(WP_REST_Request $request): bool
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
 * Whether the post is an active Elementor document.
 */
function forge_elementor_is_active($post_id): bool
{
    $edit_mode = get_post_meta($post_id, '_elementor_edit_mode', true);
    $data = get_post_meta($post_id, '_elementor_data', true);
    return $edit_mode === 'builder' || $edit_mode === 'true'
        || (is_string($data) && $data !== '' && $data !== '[]');
}

/**
 * Read an Elementor document.
 */
function forge_elementor_read_document(WP_REST_Request $request): WP_REST_Response
{
    $post_id = absint($request['id']);
    $post = get_post($post_id);
    if (!$post || !in_array($post->post_type, array('page', 'post'), true)) {
        return new WP_REST_Response(array('error' => 'document_not_found'), 404);
    }
    if (!forge_elementor_is_active($post_id)) {
        return new WP_REST_Response(array('error' => 'elementor_not_active'), 501);
    }

    $data = get_post_meta($post_id, '_elementor_data', true);
    // _elementor_data is stored with slashes by WordPress; normalize for JSON transport.
    if (is_string($data)) {
        $data = wp_unslash($data);
    }

    return new WP_REST_Response(array(
        'postId'          => $post_id,
        'title'           => $post->post_title,
        'type'            => $post->post_type,
        'elementorVersion' => get_post_meta($post_id, '_elementor_version', true) ?: null,
        'editMode'        => get_post_meta($post_id, '_elementor_edit_mode', true) ?: null,
        'data'            => $data,
        'modified'        => $post->post_modified_gmt,
    ), 200);
}

/**
 * Write an Elementor document atomically with optimistic concurrency.
 *
 * Body: { data: string (full _elementor_data JSON), expectedVersion?, expectedFingerprint?, expectedModified? }
 *
 * The whole document is replaced in one request; partial writes are impossible.
 * If the remote source changed since the caller read it, a 409 is returned and
 * nothing is written.
 */
function forge_elementor_write_document(WP_REST_Request $request): WP_REST_Response
{
    $post_id = absint($request['id']);
    $post = get_post($post_id);
    if (!$post || !in_array($post->post_type, array('page', 'post'), true)) {
        return new WP_REST_Response(array('error' => 'document_not_found'), 404);
    }
    if (!forge_elementor_is_active($post_id)) {
        return new WP_REST_Response(array('error' => 'elementor_not_active'), 501);
    }

    $params = $request->get_json_params();
    $data = isset($params['data']) ? wp_unslash((string) $params['data']) : '';
    if ($data === '') {
        return new WP_REST_Response(array('error' => 'empty_data'), 400);
    }
    $decoded = json_decode($data, true);
    if (!is_array($decoded)) {
        return new WP_REST_Response(array('error' => 'invalid_json'), 400);
    }

    // Optimistic concurrency: reject if the source changed since the caller read it.
    $current = get_post_meta($post_id, '_elementor_data', true);
    if (is_string($current)) {
        $current = wp_unslash($current);
    }
    $current_modified = get_post_modified_time('c', true, $post_id);
    $expected_modified = isset($params['expectedModified']) ? (string) $params['expectedModified'] : '';

    if ($expected_modified !== '' && $current_modified !== '' && $current_modified !== $expected_modified) {
        return new WP_REST_Response(array('error' => 'version_conflict', 'currentModified' => $current_modified), 409);
    }
    if ($current !== '' && $current !== null && $current !== $data) {
        // The caller must pass the exact current source; any mismatch means the
        // document changed underneath them. (Elementor rewrites JSON formatting,
        // so compare structurally when the raw strings differ.)
        if (!forge_elementor_json_equivalent($current, $data)) {
            return new WP_REST_Response(array('error' => 'version_conflict'), 409);
        }
    }

    // Path D: use Elementor's native server-side save when available.
    $saved = false;
    if (class_exists('\Elementor\Plugin')) {
        try {
            $document = \Elementor\Plugin::$instance->documents->get($post_id);
            if ($document && method_exists($document, 'save')) {
                $document->save(array('elements' => $decoded));
                $saved = true;
            }
        } catch (\Exception $e) {
            // Fall through to raw meta write below rather than failing hard.
        }
    }
    if (!$saved) {
        update_post_meta($post_id, '_elementor_data', wp_slash(wp_json_encode($decoded)));
    }

    // Clear Elementor CSS cache so the rendered page reflects the change.
    if (class_exists('\Elementor\Plugin') && method_exists(\Elementor\Plugin::$instance, 'files_manager')) {
        try {
            \Elementor\Plugin::$instance->files_manager->clear_cache();
        } catch (\Exception $e) {
            // Non-fatal.
        }
    }

    $re_read = get_post_meta($post_id, '_elementor_data', true);
    if (is_string($re_read)) {
        $re_read = wp_unslash($re_read);
    }

    return new WP_REST_Response(array(
        'postId'          => $post_id,
        'written'         => true,
        'elementorVersion' => get_post_meta($post_id, '_elementor_version', true) ?: null,
        'editMode'        => get_post_meta($post_id, '_elementor_edit_mode', true) ?: null,
        'data'            => $re_read,
        'modified'        => get_post_modified_time('c', true, $post_id),
    ), 200);
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
        ksort($value);
        $out = array();
        foreach ($value as $k => $v) {
            $out[$k] = forge_elementor_normalize($v);
        }
        return $out;
    }
    return $value;
}
