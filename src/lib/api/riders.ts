import { authorizedAPI } from "@/lib/api";
import handleApiRequest from "@/lib/handleApiRequest";

export interface Rider {
   id: string;
   fullName: string;
   phone: string;
   vehicle?: string;
   status?: string;
   createdAt?: string;
   updatedAt?: string;
}

/**
 * Create rider (admin)
 */
export async function createRider(data: {
   email?: string;
   password?: string;
   fullName?: string;
   phone?: string;
   vehicle?: string;
   active?: boolean;
   imageUrl?: string;
   location?: string;
}): Promise<Rider> {
   return handleApiRequest(() => authorizedAPI.post("/riders", data));
}

/**
 * Update rider (admin)
 */
export async function updateRider(
   id: string,
   data: {
      fullName?: string;
      phone?: string;
      vehicle?: string;
   },
): Promise<Rider> {
   return handleApiRequest(() => authorizedAPI.put(`/riders/${id}`, data));
}

/**
 * Delete rider (admin)
 */
export async function deleteRider(id: string): Promise<void> {
   return handleApiRequest(() => authorizedAPI.delete(`/riders/${id}`));
}

/**
 * Assign order to rider (admin)
 */
export async function assignOrderToRider(
   riderId: string,
   orderId: string,
): Promise<any> {
   return handleApiRequest(() =>
      authorizedAPI.post(`/riders/${riderId}/assign`, { orderId }),
   );
}

/**
 * Reassign order to rider (admin)
 */
export async function reassignOrderToRider(
   riderId: string,
   orderId: string,
): Promise<any> {
   return handleApiRequest(() =>
      authorizedAPI.post(`/riders/${riderId}/reassign`, { orderId }),
   );
}

/**
 * Respond to assignment (rider)
 */
export async function respondToAssignment(
   assignmentId: string,
   status: "accepted" | "rejected",
): Promise<any> {
   return handleApiRequest(() =>
      authorizedAPI.post(`/riders/assignments/${assignmentId}/respond`, {
         status,
      }),
   );
}

/**
 * Add manual fee adjustment to rider (admin)
 */
export async function addFeeAdjustment(
   riderId: string,
   data: {
      amount: number;
      reason: string;
      transactionDate?: string;
   },
): Promise<any> {
   return handleApiRequest(() =>
      authorizedAPI.post(`/riders/${riderId}/fee-adjustments`, data),
   );
}

/**
 * Get fee adjustments for a rider (admin)
 */
export async function getFeeAdjustments(
   riderId: string,
   limit?: number,
): Promise<any[]> {
   const params = limit ? { limit } : {};
   return handleApiRequest(() =>
      authorizedAPI.get(`/riders/${riderId}/fee-adjustments`, { params }),
   );
}
