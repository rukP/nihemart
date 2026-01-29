import { authorizedAPI, unauthorizedAPI } from "../api";
import handleApiRequest from "@/lib/handleApiRequest";

export interface OrdersEnabledResponse {
  enabled: boolean;
  mode: "auto" | "manual";
  schedule?: {
    startTime?: string;
    endTime?: string;
  };
}

// Internal API functions
const settingsAPI = {
  // Get orders enabled status (public endpoint)
  getOrdersEnabled: async (): Promise<OrdersEnabledResponse> => {
    return handleApiRequest(() => unauthorizedAPI.get("/settings/orders-enabled"));
  },

  // Set orders enabled status (admin only)
  setOrdersEnabled: async (enabled: boolean | "auto"): Promise<OrdersEnabledResponse> => {
    return handleApiRequest(() =>
      authorizedAPI.post("/settings/orders-enabled", { enabled })
    );
  },

  // Reset orders enabled to schedule mode (admin only)
  resetOrdersEnabled: async (): Promise<OrdersEnabledResponse> => {
    return handleApiRequest(() => authorizedAPI.delete("/settings/orders-enabled"));
  },
};

export default settingsAPI;

