export interface MondayBuilding {
  id: string;
  name: string;
  buildingAddress: string;
  apartmentType: string;
}

export interface MondayApartment {
  id: string;
  name: string;
  apartmentType: string;
  buildingAddress: string;
}

const MONDAY_API_TOKEN = "eyJhbGciOiJIUzI1NiJ9.eyJ0aWQiOjUzOTcyMTg4NCwiYWFpIjoxMSwidWlkIjo3ODE3NzU4NCwiaWFkIjoiMjAyNS0wNy0xNlQxMjowMDowOC45MzJaIiwicGVyIjoibWU6d3JpdGUiLCJhY3RpZCI6NTUxNjQ0NSwicmduIjoidXNlMSJ9.2r-Dir1kBSZX7fAOjIcAcqfxq-AHpXk3w8jVQvX5kBM";

const query = `
query {
  boards(ids: [8740450373]) {
    items_page(
      query_params: {
        rules: [
          {
            column_id: "color_mkp7fmq4",
            compare_value: "Vacant",
            operator: contains_terms
          }
        ]
      }
    ) {
      items {
        id
        name
        column_values(ids: ["name", "color_mkp77nrv", "color_mkp7xdce"]) {
          id
          text
        }
      }
    }
  }
}
`;

export class MondayService {
  static async fetchVacantApartments(): Promise<MondayApartment[]> {
    try {
      const response = await fetch('https://api.monday.com/v2', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': MONDAY_API_TOKEN,
        },
        body: JSON.stringify({
          query: query
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const items = data?.data?.boards?.[0]?.items_page?.items ?? [];
      
      return items.map((item: any) => {
        const columnValues = item.column_values.reduce((acc: any, col: any) => {
          acc[col.id] = col.text;
          return acc;
        }, {});

        return {
          id: item.id,
          name: item.name, // This is the apartment name/number
          apartmentType: columnValues.color_mkp77nrv || '', // Apartment Type
          buildingAddress: columnValues.color_mkp7xdce || '', // Building Address
        };
      });
    } catch (error) {
      console.error("Error fetching Monday.com data:", error);
      return [];
    }
  }

  static getUniqueBuildings(apartments: MondayApartment[]): MondayBuilding[] {
    const buildingMap = new Map<string, MondayBuilding>();
    
    apartments.forEach(apartment => {
      if (apartment.buildingAddress && !buildingMap.has(apartment.buildingAddress)) {
        buildingMap.set(apartment.buildingAddress, {
          id: apartment.buildingAddress,
          name: apartment.buildingAddress,
          buildingAddress: apartment.buildingAddress,
          apartmentType: apartment.apartmentType,
        });
      }
    });
    
    return Array.from(buildingMap.values());
  }

  static getApartmentsForBuilding(apartments: MondayApartment[], buildingAddress: string): MondayApartment[] {
    return apartments.filter(apartment => apartment.buildingAddress === buildingAddress);
  }
} 