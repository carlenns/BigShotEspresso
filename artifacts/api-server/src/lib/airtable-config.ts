export function getCoffeeLogAirtableConfig() {
  const token = process.env.COFFEELOG_AIRTABLE_API_KEY ?? process.env.AIRTABLE_API_KEY;
  const baseId = process.env.COFFEELOG_AIRTABLE_BASE_ID ?? process.env.AIRTABLE_BASE_ID;
  return {
    token,
    baseId,
    hasToken: !!token,
    hasBaseId: !!baseId,
  };
}
