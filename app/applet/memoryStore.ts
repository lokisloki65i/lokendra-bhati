import fs from "fs";
import path from "path";

const MEMORY_FILE = path.join(process.cwd(), "memory_db.json");

export interface MemoryEntry {
  category: string;
  key: string;
  value: string;
  timestamp: string;
}

export class MemoryStore {
  private memories: Record<string, MemoryEntry> = {};

  constructor() {
    this.load();
  }

  private load() {
    if (fs.existsSync(MEMORY_FILE)) {
      try {
        const data = fs.readFileSync(MEMORY_FILE, "utf-8");
        this.memories = JSON.parse(data);
      } catch (err) {
        console.error("[MemoryStore] Failed to load memory file:", err);
      }
    }
  }

  private save() {
    try {
      fs.writeFileSync(MEMORY_FILE, JSON.stringify(this.memories, null, 2), "utf-8");
    } catch (err) {
      console.error("[MemoryStore] Failed to save memory file:", err);
    }
  }

  public storeMemory(category: string, key: string, value: string): void {
    this.memories[key] = {
      category,
      key,
      value,
      timestamp: new Date().toISOString(),
    };
    this.save();
    console.log(`[MemoryStore] Stored memory: [${category}] ${key} = ${value}`);
  }

  public forgetMemory(key: string): void {
    if (this.memories[key]) {
      delete this.memories[key];
      this.save();
      console.log(`[MemoryStore] Forgot memory: ${key}`);
    }
  }

  public getAllMemories(): MemoryEntry[] {
    return Object.values(this.memories);
  }

  public formatMemoriesForPrompt(): string {
    const entries = this.getAllMemories();
    if (entries.length === 0) return "No long-term memories stored yet.";
    
    // Group by category
    const grouped = entries.reduce((acc, entry) => {
      if (!acc[entry.category]) acc[entry.category] = [];
      acc[entry.category].push(`${entry.key}: ${entry.value}`);
      return acc;
    }, {} as Record<string, string[]>);

    let formatted = "";
    for (const [category, items] of Object.entries(grouped)) {
      formatted += `\n[${category.toUpperCase()}]\n`;
      items.forEach(item => formatted += `- ${item}\n`);
    }
    
    return formatted.trim();
  }
}
