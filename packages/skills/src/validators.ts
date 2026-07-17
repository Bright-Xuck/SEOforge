export function validateTitleLength(title: string): boolean {
  return title.length >= 30 && title.length <= 60;
}

export function validateMetaDescriptionLength(description: string): boolean {
  return description.length >= 120 && description.length <= 160;
}

export function validateHeadingLength(heading: string): boolean {
  return heading.length <= 70;
}

export function validateJsonLike(value: string): boolean {
  try {
    JSON.parse(value);
    return true;
  } catch {
    return false;
  }
}
