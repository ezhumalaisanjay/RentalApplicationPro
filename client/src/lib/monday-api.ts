const MONDAY_API_TOKEN = "eyJhbGciOiJIUzI1NiJ9.eyJ0aWQiOjUzOTcyMTg4NCwiYWFpIjoxMSwidWlkIjo3ODE3NzU4NCwiaWFkIjoiMjAyNS0wNy0xNlQxMjowMDowOC4wMDBaIiwicGVyIjoibWU6d3JpdGUiLCJhY3RpZCI6NTUxNjQ0NSwicmduIjoidXNlMSJ9.s43_kjRmv-QaZ92LYdRlEvrq9CYqxKhh3XXpR-8nhKU";
const BOARD_ID = "8740450373";

export type UnitItem = {
  id: string;
  name: string; // Apartment Name
  propertyName: string; // Building Address
  unitType: string; // Apartment Type
  status: string; // Status (Vacant, etc.)
};

export class MondayApiService {
  private static async makeRequest(query: string) {
    try {
      const response = await fetch('https://api.monday.com/v2', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': MONDAY_API_TOKEN,
        },
        body: JSON.stringify({ query }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Monday API request failed:', error);
      throw error;
    }
  }

  static async fetchVacantUnits(): Promise<UnitItem[]> {
    const query = `
      query {
        boards(ids: [${BOARD_ID}]) {
          items_page(query_params: {
            rules: [
              { column_id: "color_mkp7fmq4", compare_value: "Vacant", operator: contains_terms }
            ]
          }) {
            items {
              id
              name
              column_values(ids: ["color_mkp7xdce", "color_mkp77nrv", "color_mkp7fmq4"]) {
                id
                text
              }
            }
          }
        }
      }
    `;

    try {
      const result = await this.makeRequest(query);
      const items = result?.data?.boards?.[0]?.items_page?.items ?? [];

      return items.map((item: any) => ({
        id: item.id,
        name: item.name,
        propertyName: item.column_values.find((c: any) => c.id === "color_mkp7xdce")?.text || "",
        unitType: item.column_values.find((c: any) => c.id === "color_mkp77nrv")?.text || "",
        status: item.column_values.find((c: any) => c.id === "color_mkp7fmq4")?.text || ""
      }));
    } catch (error) {
      console.error('Error fetching vacant units:', error);
      return [];
    }
  }

  static getUniqueBuildingAddresses(units: UnitItem[]): string[] {
    return Array.from(new Set(units.map(unit => unit.propertyName))).filter(Boolean);
  }

  static getUnitsByBuilding(units: UnitItem[], buildingAddress: string): UnitItem[] {
    return units.filter(unit => unit.propertyName === buildingAddress);
  }
} 