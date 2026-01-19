import React, { useEffect, useState, useRef, useCallback } from "react";
import { ChevronRight, X } from "lucide-react";
import {
  limit,
  where,
  orderBy,
  startAfter,
  QueryDocumentSnapshot,
  DocumentData,
} from "firebase/firestore";
import { Activity, Profile } from "../models";
import { FirebaseServices } from "../services/firebase.service";
import dayjs from "dayjs";
import { ProfileService } from "../services/profile.service";
import { getRandomColor } from "../utils/colors";
import { ActivityService } from "../services/activity.service";

export default function ActivitySidebar({ projectId }: { projectId: string }) {
  const [recentActivities, setRecentActivities] = useState<Activity[]>([]);
  const [modalActivities, setModalActivities] = useState<Activity[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [lastDoc, setLastDoc] =
    useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const observerRef = useRef<HTMLDivElement | null>(null);

  const PAGE_SIZE = 20;

  /* 🧩 Charger les 5 dernières activités pour la sidebar */
  useEffect(() => {
    const fetchRecent = async () => {
      try {
        const lastFive = await ActivityService.getByProjectId(projectId, [
          limit(5),
        ]);
        setRecentActivities(lastFive);
      } catch (error) {
        console.error("Erreur chargement activités récentes:", error);
      }
    };
    fetchRecent();
  }, [projectId]);

  /* 🔹 Charger la première page */
  const fetchFirstPage = async () => {
    try {
      const queryConditions = [
        where("projectId", "==", projectId),
        orderBy("createdAt", "desc"),
        limit(PAGE_SIZE),
      ];
      const { docs, lastVisible } =
        await FirebaseServices.getDocsPaginated<Activity>(
          "activities",
          queryConditions
        );

      setModalActivities(docs);
      setLastDoc(lastVisible);
      setHasMore(docs.length === PAGE_SIZE);
    } catch (error) {
      console.error("Erreur lors du chargement initial :", error);
    }
  };

  /* 🔹 Charger la page suivante automatiquement */
  const fetchNextPage = useCallback(async () => {
    if (!lastDoc || !hasMore || isLoadingMore) return;
    setIsLoadingMore(true);
    try {
      const queryConditions = [
        where("projectId", "==", projectId),
        orderBy("createdAt", "desc"),
        startAfter(lastDoc),
        limit(PAGE_SIZE),
      ];
      const { docs, lastVisible } =
        await FirebaseServices.getDocsPaginated<Activity>(
          "activities",
          queryConditions
        );

      setModalActivities((prev) => [...prev, ...docs]);
      setLastDoc(lastVisible);
      setHasMore(docs.length === PAGE_SIZE);
    } catch (error) {
      console.error("Erreur pagination activités:", error);
    } finally {
      setIsLoadingMore(false);
    }
  }, [lastDoc, hasMore, isLoadingMore, projectId]);

  /* 👁️ IntersectionObserver pour liste infinie */
  useEffect(() => {
    if (!isModalOpen) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const target = entries[0];
        if (target.isIntersecting && hasMore) {
          fetchNextPage();
        }
      },
      { rootMargin: "200px" }
    );
    const currentRef = observerRef.current;
    if (currentRef) observer.observe(currentRef);

    return () => {
      if (currentRef) observer.unobserve(currentRef);
    };
  }, [isModalOpen, fetchNextPage, hasMore]);

  /* 🪟 Ouvrir la modale */
  const handleOpenModal = async () => {
    setIsModalOpen(true);
    setModalActivities([]);
    setHasMore(true);
    setLastDoc(null);
    await fetchFirstPage();
  };

  return (
    <>
      <div className="w-80 h-full bg-white border-l border-gray-200 p-6">
        {/* Activité Section */}
        <div className="mb-8">
          <div className="flex justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Activité</h3>
            <button
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              onClick={handleOpenModal}
            >
              Voir +
            </button>
          </div>

          <div className="space-y-4">
            {recentActivities.length > 0 ? (
              recentActivities.map((activity) => (
                <ActivityCard activity={activity} key={activity.id} />
              ))
            ) : (
              <p className="text-sm text-gray-500">Aucune activité récente</p>
            )}
          </div>
        </div>

        {/* Notes Section */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Notes</h3>
            <ChevronRight className="w-4 h-4 text-gray-400" />
          </div>
          <div className="space-y-3">
            <div className="p-3 bg-gray-50 rounded-lg">
              <h4 className="font-medium text-gray-900 text-sm mb-1">
                Mémo équipe
              </h4>
              <p className="text-xs text-gray-600">
                Réunion lundi pour définir les prochaines étapes.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 🧱 Modal Activités */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-4xl max-h-[85vh] flex flex-col">
            {/* Header */}
            <div className="flex justify-between items-center border-b p-4">
              <h2 className="text-lg font-semibold text-gray-900">
                Activités du projet
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Table */}
            <div className="overflow-y-auto flex-1">
              <table className="min-w-full text-sm">
                <thead className="bg-gray-50 border-b text-gray-600 text-xs uppercase">
                  <tr>
                    <th className="text-left px-6 py-2">Utilisateur</th>
                    <th className="text-left px-6 py-2">Action</th>
                    <th className="text-left px-6 py-2">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {modalActivities.map((activity) => (
                    <ActivityRow key={activity.id} activity={activity} />
                  ))}

                  {/* Loader visuel */}
                  {isLoadingMore && (
                    <tr>
                      <td
                        colSpan={3}
                        className="py-6 text-center text-gray-400 text-sm"
                      >
                        Chargement...
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>

              {/* 🔹 Élément sentinelle (déclencheur de scroll infini) */}
              <div ref={observerRef} className="h-10" />
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* ────────────────────────────── */
/* 🔹 Ligne du tableau */
function ActivityRow({ activity }: { activity: Activity }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  useEffect(() => {
    (async () => {
      const data = await ProfileService.getById(activity.userId);
      setProfile(data);
    })();
  }, [activity.userId]);

  return (
    <tr className="border-b hover:bg-gray-50 transition-colors">
      <td className="px-6 py-2 flex items-center space-x-3">
        {profile?.photoURL ? (
          <img
            src={profile.photoURL}
            alt={profile.displayName || ""}
            className="w-8 h-8 rounded-full object-cover"
          />
        ) : (
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-white font-medium text-xs"
            style={{ backgroundColor: profile?.color || getRandomColor() }}
          >
            {profile?.displayName?.[0]?.toUpperCase() || "U"}
          </div>
        )}
        <span className="text-gray-900 font-medium text-sm truncate max-w-[120px]">
          {profile?.displayName || "Utilisateur"}
        </span>
      </td>
      <td className="px-6 py-3 text-gray-700">{activity.description}</td>
      <td className="px-6 py-3 text-gray-500 text-sm">
        {dayjs(activity.createdAt).format("DD/MM/YYYY HH:mm")}
      </td>
    </tr>
  );
}

/* ────────────────────────────── */
/* 🔹 Carte compacte */
function ActivityCard({ activity }: { activity: Activity }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  useEffect(() => {
    (async () => {
      const data = await ProfileService.getById(activity.userId);
      setProfile(data);
    })();
  }, [activity.userId]);

  return (
    <div className="flex items-start space-x-3">
      {profile?.photoURL ? (
        <img
          src={profile.photoURL}
          alt={profile.displayName || ""}
          className="w-9 h-9 rounded-full border object-cover"
        />
      ) : (
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center text-white font-semibold"
          style={{ backgroundColor: profile?.color || getRandomColor() }}
        >
          {profile?.displayName?.charAt(0).toUpperCase() || "U"}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-900 font-medium truncate">
          {profile?.displayName || "Utilisateur"}
        </p>
        <p className="text-xs text-gray-600 truncate">{activity.description}</p>
        <span className="text-[11px] text-gray-400">
          {dayjs(activity.createdAt).format("HH:mm")}
        </span>
      </div>
    </div>
  );
}
