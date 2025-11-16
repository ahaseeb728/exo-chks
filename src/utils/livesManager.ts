import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LIVES_FILE = path.join(__dirname, "../../lives.json");

export interface LiveCard {
  cc: string;
  mm: string;
  yy: string;
  cvv?: string;
  amount: string;
  gateway: string;
  binInfo: string;
  timestamp: number;
}

function loadLives(): LiveCard[] {
  try {
    if (fs.existsSync(LIVES_FILE)) {
      const data = fs.readFileSync(LIVES_FILE, "utf-8");
      return JSON.parse(data);
    }
  } catch (error) {
    console.error("[LivesManager] Error loading lives:", error);
  }
  return [];
}

function saveLives(lives: LiveCard[]): void {
  try {
    fs.writeFileSync(LIVES_FILE, JSON.stringify(lives, null, 2), "utf-8");
  } catch (error) {
    console.error("[LivesManager] Error saving lives:", error);
  }
}

function getCardKey(card: { cc: string; mm: string; yy: string }): string {
  return `${card.cc}|${card.mm}|${card.yy}`;
}

export function addOrUpdateLive(
  cc: string,
  mm: string,
  yy: string,
  cvv: string | undefined,
  amount: string,
  gateway: string,
  binInfo: string
): void {
  const lives = loadLives();
  const cardKey = getCardKey({ cc, mm, yy });
  
  // Find existing card
  const existingIndex = lives.findIndex(
    (card) => getCardKey(card) === cardKey
  );
  
  if (existingIndex !== -1) {
    // Card exists - move to top and update info
    const existingCard = lives[existingIndex];
    lives.splice(existingIndex, 1);
    lives.unshift({
      ...existingCard,
      cvv: cvv || existingCard.cvv,
      amount,
      gateway,
      binInfo,
      timestamp: Date.now(),
    });
  } else {
    // New card - add to top
    lives.unshift({
      cc,
      mm,
      yy,
      cvv,
      amount,
      gateway,
      binInfo,
      timestamp: Date.now(),
    });
  }
  
  saveLives(lives);
}

export function removeLive(cc: string, mm: string, yy: string): void {
  const lives = loadLives();
  const cardKey = getCardKey({ cc, mm, yy });
  
  const filtered = lives.filter((card) => getCardKey(card) !== cardKey);
  
  if (filtered.length !== lives.length) {
    saveLives(filtered);
  }
}

export function getAllLives(): LiveCard[] {
  return loadLives();
}

export function getLivesPage(page: number, pageSize: number = 10): {
  lives: LiveCard[];
  totalPages: number;
  currentPage: number;
} {
  const allLives = loadLives();
  const totalPages = Math.ceil(allLives.length / pageSize);
  const currentPage = Math.max(1, Math.min(page, totalPages));
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  
  return {
    lives: allLives.slice(startIndex, endIndex),
    totalPages: totalPages || 1,
    currentPage,
  };
}

export function formatCardDisplay(card: LiveCard): string {
  const cardPart = card.cvv 
    ? `${card.cc}|${card.mm}|${card.yy}|${card.cvv}`
    : `${card.cc}|${card.mm}|${card.yy}`;
  return `${cardPart} - Approved (${card.amount}) (${card.gateway})\nBin: ${card.binInfo || "Unknown"}`;
}

