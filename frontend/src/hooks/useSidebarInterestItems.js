import { useEffect, useMemo, useState } from "react";
import { getMySports } from "../api/memberApi";
import { useAuth } from "../contexts/AuthContext";
import { getSportIconName } from "../utils/sportIconMap";

export default function useSidebarInterestItems() {
  const { user, isAuthenticated, loading } = useAuth();
  const [sports, setSports] = useState([]);

  useEffect(() => {
    let active = true;

    const loadSports = async () => {
      if (loading) return;

      if (!isAuthenticated || !user?.memberId) {
        if (active) setSports([]);
        return;
      }

      try {
        const { data } = await getMySports(user.memberId);
        if (!active) return;

        setSports(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error("Failed to load sidebar interest sports:", error);
        if (active) setSports([]);
      }
    };

    loadSports();

    return () => {
      active = false;
    };
  }, [isAuthenticated, loading, user?.memberId]);

  return useMemo(
    () =>
      sports.map((sport) => ({
        label: sport.name,
        icon: getSportIconName(sport),
      })),
    [sports],
  );
}
