import { rentalApplications, type RentalApplication, type InsertRentalApplication } from "@shared/schema";

export interface IStorage {
  getApplication(id: number): Promise<RentalApplication | undefined>;
  createApplication(application: InsertRentalApplication): Promise<RentalApplication>;
  updateApplication(id: number, application: Partial<InsertRentalApplication>): Promise<RentalApplication | undefined>;
  getAllApplications(): Promise<RentalApplication[]>;
}

export class MemStorage implements IStorage {
  private applications: Map<number, RentalApplication>;
  private currentId: number;

  constructor() {
    this.applications = new Map();
    this.currentId = 1;
  }

  async getApplication(id: number): Promise<RentalApplication | undefined> {
    return this.applications.get(id);
  }

  async createApplication(insertApplication: InsertRentalApplication): Promise<RentalApplication> {
    const id = this.currentId++;
    const application: RentalApplication = { 
      ...insertApplication, 
      id,
      applicationDate: new Date(),
      submittedAt: insertApplication.status === 'submitted' ? new Date() : null,
    };
    this.applications.set(id, application);
    return application;
  }

  async updateApplication(id: number, updateData: Partial<InsertRentalApplication>): Promise<RentalApplication | undefined> {
    const existing = this.applications.get(id);
    if (!existing) return undefined;

    const updated: RentalApplication = { 
      ...existing, 
      ...updateData,
      submittedAt: updateData.status === 'submitted' ? new Date() : existing.submittedAt,
    };
    this.applications.set(id, updated);
    return updated;
  }

  async getAllApplications(): Promise<RentalApplication[]> {
    return Array.from(this.applications.values());
  }
}

export const storage = new MemStorage();
