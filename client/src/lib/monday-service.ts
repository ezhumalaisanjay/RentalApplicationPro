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

export class MondayService {
  static async fetchVacantApartments(): Promise<MondayApartment[]> {
    try {
      console.log('=== MONDAY SERVICE DEBUG START ===');
      console.log('Making request to Monday.com API...');
      const url = `/api/monday/vacant-apartments?t=${Date.now()}`;
      console.log('Request URL:', url);
      console.log('Current window location:', window.location.href);
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });

      console.log('Response status:', response.status);
      console.log('Response headers:', response.headers);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error response text:', errorText);
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const responseText = await response.text();
      console.log('Response text:', responseText);
      
      const data = JSON.parse(responseText);
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