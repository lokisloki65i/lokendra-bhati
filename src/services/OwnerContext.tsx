import React, { createContext, useContext, useState, useEffect } from "react";

export interface OwnerConfig {
  apiKey: string;
  ownerName: string;
  isConfigured: boolean;
}

interface OwnerContextType {
  ownerConfig: OwnerConfig;
  setOwnerConfig: (config: { apiKey: string; ownerName: string }) => void;
  clearOwnerConfig: () => void;
  isOwnerConfigured: boolean;
  ownerName: string;
  isOwnerModalOpen: boolean;
  setIsOwnerModalOpen: (open: boolean) => void;
}

const STORAGE_KEY_API = "myraa_owner_gemini_api_key";
const STORAGE_KEY_NAME = "myraa_owner_master_name";

const OwnerContext = createContext<OwnerContextType | undefined>(undefined);

export const OwnerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [apiKey, setApiKey] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem(STORAGE_KEY_API) || "";
    }
    return "";
  });

  const [ownerName, setOwnerName] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem(STORAGE_KEY_NAME) || "";
    }
    return "";
  });

  const [isOwnerModalOpen, setIsOwnerModalOpen] = useState(false);

  const isOwnerConfigured = Boolean(apiKey.trim() && ownerName.trim());

  const saveConfig = ({ apiKey: newKey, ownerName: newName }: { apiKey: string; ownerName: string }) => {
    const cleanKey = newKey.trim();
    const cleanName = newName.trim();
    setApiKey(cleanKey);
    setOwnerName(cleanName);
    try {
      localStorage.setItem(STORAGE_KEY_API, cleanKey);
      localStorage.setItem(STORAGE_KEY_NAME, cleanName);
    } catch {
      // storage error fallback
    }
  };

  const clearConfig = () => {
    setApiKey("");
    setOwnerName("");
    try {
      localStorage.removeItem(STORAGE_KEY_API);
      localStorage.removeItem(STORAGE_KEY_NAME);
    } catch {
      // storage error fallback
    }
  };

  return (
    <OwnerContext.Provider
      value={{
        ownerConfig: {
          apiKey,
          ownerName,
          isConfigured: isOwnerConfigured,
        },
        setOwnerConfig: saveConfig,
        clearOwnerConfig: clearConfig,
        isOwnerConfigured,
        ownerName,
        isOwnerModalOpen,
        setIsOwnerModalOpen,
      }}
    >
      {children}
    </OwnerContext.Provider>
  );
};

export const useOwner = () => {
  const context = useContext(OwnerContext);
  if (!context) {
    throw new Error("useOwner must be used within an OwnerProvider");
  }
  return context;
};
