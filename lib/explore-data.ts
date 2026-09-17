export type ExploreRegion = {
  name: string
  description: string
  slug: string
  search: string
}

export type ExplorePlace = {
  name: string
  slug: string
  search: string
}

export const africaRegions: ExploreRegion[] = [
  { name: "Southern Africa", description: "SADC and the countries of the south", slug: "southern-africa", search: "Southern Africa" },
  { name: "East Africa", description: "The Horn, Great Lakes and Indian Ocean", slug: "east-africa", search: "East Africa" },
  { name: "West Africa", description: "Atlantic states and the wider region", slug: "west-africa", search: "West Africa" },
  { name: "Central Africa", description: "The Congo Basin and central states", slug: "central-africa", search: "Central Africa" },
  { name: "North Africa", description: "The Mediterranean and Sahara", slug: "north-africa", search: "North Africa" },
  { name: "Sahel", description: "Communities across the southern Sahara", slug: "sahel", search: "Sahel" },
]

export const africanCountries: ExplorePlace[] = [
  "Algeria", "Angola", "Benin", "Botswana", "Burkina Faso", "Burundi", "Cabo Verde", "Cameroon",
  "Central African Republic", "Chad", "Comoros", "Democratic Republic of the Congo", "Djibouti", "Egypt",
  "Equatorial Guinea", "Eritrea", "Eswatini", "Ethiopia", "Gabon", "The Gambia", "Ghana", "Guinea",
  "Guinea-Bissau", "Côte d'Ivoire", "Kenya", "Lesotho", "Liberia", "Libya", "Madagascar", "Malawi",
  "Mali", "Mauritania", "Mauritius", "Morocco", "Mozambique", "Namibia", "Niger", "Nigeria",
  "Republic of the Congo", "Rwanda", "São Tomé and Príncipe", "Senegal", "Seychelles", "Sierra Leone",
  "Somalia", "South Africa", "South Sudan", "Sudan", "Tanzania", "Togo", "Tunisia", "Uganda",
  "Zambia", "Zimbabwe",
].map((name) => ({ name, slug: slugify(name), search: name }))

export const africanCities: ExplorePlace[] = [
  "Harare", "Bulawayo", "Johannesburg", "Cape Town", "Lusaka", "Gaborone", "Maputo", "Windhoek",
  "Nairobi", "Kampala", "Dar es Salaam", "Addis Ababa", "Kigali", "Cairo", "Casablanca", "Algiers",
  "Lagos", "Accra", "Abidjan", "Dakar", "Abuja", "Kinshasa", "Luanda", "Antananarivo",
].map((name) => ({ name, slug: slugify(name), search: name }))

export const worldRegions: ExploreRegion[] = [
  { name: "Europe", description: "Stories, people and conversations from Europe", slug: "europe", search: "Europe" },
  { name: "Middle East", description: "News and communities across the Middle East", slug: "middle-east", search: "Middle East" },
  { name: "Asia-Pacific", description: "Asia, Oceania and the Pacific", slug: "asia-pacific", search: "Asia Pacific" },
  { name: "North America", description: "United States, Canada and the wider region", slug: "north-america", search: "North America" },
  { name: "Latin America & Caribbean", description: "Stories from Latin America and the Caribbean", slug: "latin-america-caribbean", search: "Latin America Caribbean" },
  { name: "Global", description: "Conversations that connect Africa with the world", slug: "global", search: "Global" },
]

export function slugify(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
}

export function findAfricanCountry(slug: string) {
  return africanCountries.find((item) => item.slug === slug)
}

export function findAfricanCity(slug: string) {
  return africanCities.find((item) => item.slug === slug)
}

export function findRegion(slug: string) {
  return africaRegions.find((item) => item.slug === slug)
}

export function findWorldRegion(slug: string) {
  return worldRegions.find((item) => item.slug === slug)
}
