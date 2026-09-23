/* eslint-disable react-hooks/set-state-in-effect -- Hydrate browser role and subscribe to server state after SSR. */
"use client";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
  useCallback,
} from "react";
import { toast } from "sonner";
import { storeSchema } from "@/lib/schema";
const Context = createContext(null);
export function StoreProvider({ children }) {
  const [db, setDb] = useState({ version: 1, challenges: [], proposals: [] });
  const [ready, setReady] = useState(false);
  const [role, setRoleState] = useState("Business");
  const [storageError, setStorageError] = useState("");
  const [saving, setSaving] = useState(false);
  const [lastReview, setLastReview] = useState(null);
  const [legacyAvailable, setLegacyAvailable] = useState(false);
  const operation = useRef(false);
  const revision = useRef(0);
  const refresh = useCallback(async () => {
    const version = revision.current;
    try {
      const response = await fetch("/api/store", {
        cache: "no-store",
        signal: AbortSignal.timeout(10000),
      });
      if (!response.ok)
        throw new Error("Could not connect to SQLite. Please retry.");
      const parsed = storeSchema.parse(await response.json());
      if (version === revision.current && !operation.current) {
        setDb(parsed);
        setStorageError("");
      }
    } catch (error) {
      setStorageError(error.message || "Database unavailable.");
    } finally {
      setReady(true);
    }
  }, []);
  useEffect(() => {
    try {
      if (localStorage.getItem("challengehub:role") === "Student")
        setRoleState("Student");
      setLegacyAvailable(Boolean(localStorage.getItem("challengehub:v1")));
    } catch {}
    refresh();
    const onFocus = () => {
      if (!operation.current) refresh();
    };
    window.addEventListener("focus", onFocus);
    const timer = setInterval(() => {
      if (document.visibilityState === "visible" && !operation.current)
        refresh();
    }, 10000);
    return () => {
      window.removeEventListener("focus", onFocus);
      clearInterval(timer);
    };
  }, [refresh]);
  function setRole(value) {
    setLastReview(null);
    setRoleState(value);
    try {
      localStorage.setItem("challengehub:role", value);
    } catch {}
    refresh();
  }
  async function commit(action) {
    if (operation.current) return false;
    operation.current = true;
    revision.current++;
    setSaving(true);
    try {
      const response = await fetch("/api/store", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-demo-role": role },
        body: JSON.stringify(action),
        signal: AbortSignal.timeout(35000),
      });
      const data = await response.json();
      if (data.review) setLastReview(data.review);
      if (!response.ok) throw new Error(data.error || "Unable to save.");
      if (action.action === "saveChallenge")
        setLastReview(
          data.challenges.find((c) => c.id === action.challenge.id)
            ?.contentReview ?? null,
        );
      setDb(storeSchema.parse(data));
      setStorageError("");
      return true;
    } catch (error) {
      toast.error(error.message || "Save failed. Please retry.");
      return false;
    } finally {
      operation.current = false;
      revision.current++;
      setSaving(false);
    }
  }
  async function saveChallenge(challenge) {
    if (role !== "Business") return false;
    return commit({ action: "saveChallenge", challenge });
  }
  async function submitProposal(challengeId, proposal) {
    if (role !== "Student") return false;
    return commit({
      action: "submitProposal",
      id: crypto.randomUUID(),
      challengeId,
      proposal,
    });
  }
  async function decide(id, status) {
    if (role !== "Business") return false;
    return commit({ action: "decide", id, status });
  }
  async function importLegacy() {
    try {
      const data = storeSchema.parse(
        JSON.parse(localStorage.getItem("challengehub:v1")),
      );
      if (await commit({ action: "importLegacy", data })) {
        setLegacyAvailable(false);
        toast.success(
          "Browser challenges imported as drafts for review. Proposals remain in the original browser backup.",
        );
      }
    } catch {
      toast.error("The browser backup could not be read.");
    }
  }
  return (
    <Context.Provider
      value={{
        db,
        ready,
        role,
        setRole,
        saveChallenge,
        submitProposal,
        decide,
        saving,
        lastReview,
        clearReview: () => setLastReview(null),
        storageError,
        refresh,
        legacyAvailable,
        importLegacy,
      }}
    >
      {children}
    </Context.Provider>
  );
}
export function useStore() {
  const context = useContext(Context);
  if (!context) throw new Error("StoreProvider missing");
  return context;
}
