import { useAuth } from "./useAuth";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export const useLogout = () => {
   const { signOut } = useAuth();
   const router = useRouter();

   const handleLogout = async () => {
      try {
         await signOut();
         toast.success("Successfully logged out");
         router.push("/");
      } catch (error) {
         toast.error("Error logging out");
         console.error("Logout error:", error);
      }
   };

   return { handleLogout };
};
