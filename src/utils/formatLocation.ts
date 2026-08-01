/**
 * Utility functions to format location strings for display purposes,
 * removing redundant region/state information if it matches or is contained
 * within the city/name component.
 */

export interface LocationComponents {
  name?: string;
  region?: string;
  country?: string;
}

/**
 * Formats location components (name/city, region/state, country) into a clean display string.
 * Removes redundant region/state if it is identical to or contained within the city name (or vice-versa).
 *
 * Examples:
 * - ("New Delhi", "Delhi", "India") => "New Delhi, India"
 * - ("New York", "New York", "United States of America") => "New York, United States of America"
 * - ("London", "Greater London", "United Kingdom") => "London, United Kingdom"
 * - ("Paris", "Ile-de-France", "France") => "Paris, Ile-de-France, France"
 */
export function formatLocation(
  name?: string,
  region?: string,
  country?: string
): string {
  const cityName = (name || '').trim();
  const regionName = (region || '').trim();
  const countryName = (country || '').trim();

  if (!cityName && !regionName && !countryName) return '';

  // Helper to normalize strings for comparison (lowercase & alphanumeric only)
  const normalize = (str: string) => str.toLowerCase().replace(/[^a-z0-9]/g, '');

  const normCity = normalize(cityName);
  const normRegion = normalize(regionName);
  const normCountry = normalize(countryName);

  let includeRegion = true;

  if (!regionName) {
    includeRegion = false;
  } else if (!cityName) {
    includeRegion = true;
  } else {
    // Check if city and region are identical or if one is contained in the other
    if (
      normCity === normRegion ||
      (normCity.length >= 3 && normRegion.includes(normCity)) ||
      (normRegion.length >= 3 && normCity.includes(normRegion))
    ) {
      includeRegion = false;
    }
  }

  // Check if region is redundant with country
  if (includeRegion && normRegion && normCountry) {
    if (
      normRegion === normCountry ||
      (normRegion.length >= 4 && normCountry.includes(normRegion)) ||
      (normCountry.length >= 4 && normRegion.includes(normCountry))
    ) {
      includeRegion = false;
    }
  }

  const parts: string[] = [];
  if (cityName) parts.push(cityName);
  if (includeRegion && regionName) parts.push(regionName);
  if (countryName) parts.push(countryName);

  return parts.join(', ');
}

/**
 * Formats a comma-separated location string (e.g. "New Delhi, Delhi, India")
 * by parsing components and removing redundant region/state info.
 */
export function formatLocationString(fullLocationStr?: string): string {
  if (!fullLocationStr) return '';
  const parts = fullLocationStr.split(',').map(p => p.trim()).filter(Boolean);
  if (parts.length === 3) {
    return formatLocation(parts[0], parts[1], parts[2]);
  } else if (parts.length === 2) {
    return formatLocation(parts[0], '', parts[1]);
  }
  return fullLocationStr;
}
