/**
 * Decorbeats — WhatsApp "DecorBeats Marketing" Bridge for Dibi (Decorbeats AI)
 *
 * Usage:
 *   node scripts/whatsapp-boss-bridge.mjs check [--mark]
 *   node scripts/whatsapp-boss-bridge.mjs send "🫡 *Dibi here, Boss! ...*"
 *   node scripts/whatsapp-boss-bridge.mjs send-file "<filepath>"
 *
 * Rules:
 *   - Dibi is the AI assistant in "DecorBeats Marketing" (`ZCHATSESSION = 895`).
 *   - Always keeps track of the FULL conversation in `public/catalogues/whatsapp-boss-state.json`.
 *   - ONLY responds in the WhatsApp group when someone mentions "Dibi" (case-insensitive).
 *   - Always addresses Ashwarya as "Boss".
 */

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const STATE_PATH = path.join(rootDir, 'public', 'catalogues', 'whatsapp-boss-state.json');

const WHATSAPP_SHARED_DIR =
  '/Users/k0d3/Library/Group Containers/group.net.whatsapp.WhatsApp.shared';
const WHATSAPP_DB_PATH = path.join(WHATSAPP_SHARED_DIR, 'ChatStorage.sqlite');
const MARKETING_CHAT_SESSION = 895;

function loadState() {
  if (fs.existsSync(STATE_PATH)) {
    try {
      const parsed = JSON.parse(fs.readFileSync(STATE_PATH, 'utf8'));
      return {
        botName: 'Dibi',
        lastProcessedPk: Number(parsed.lastProcessedPk) || 96744,
        updatedAt: parsed.updatedAt || new Date().toISOString(),
        conversationHistory: Array.isArray(parsed.conversationHistory)
          ? parsed.conversationHistory
          : []
      };
    } catch {
      // fall through
    }
  }
  return {
    botName: 'Dibi',
    lastProcessedPk: 96744,
    updatedAt: new Date().toISOString(),
    conversationHistory: []
  };
}

function saveState(state) {
  fs.mkdirSync(path.dirname(STATE_PATH), { recursive: true });
  fs.writeFileSync(STATE_PATH, JSON.stringify(state, null, 2), 'utf8');
}

const MEMBER_NAMES = {
  '251899982958709@lid': 'Megha Goel',
  '187750452088832@lid': 'Sonam',
  '29235959881771@lid': 'Boss (Ashwarya)',
  '105991320395952@lid': 'Vinay Phogat',
  '919811133661@s.whatsapp.net': 'Megha Goel',
  '919899876576@s.whatsapp.net': 'Boss (Ashwarya)'
};

export function checkNewMessages(markAsRead = false) {
  const state = loadState();
  const sql = `
    SELECT
      m.Z_PK as pk,
      datetime(m.ZMESSAGEDATE + 978307200, 'unixepoch', 'localtime') as msg_time,
      m.ZISFROMME as is_from_me,
      m.ZMESSAGETYPE as msg_type,
      m.ZFROMJID as sender_jid,
      COALESCE( pn.ZPUSHNAME, gm.ZMEMBERJID, m.ZFROMJID, CASE WHEN m.ZISFROMME = 1 THEN 'Boss (Ashwarya)' ELSE 'Group Member' END ) as member_jid,
      COALESCE(m.ZTEXT, '') as text,
      COALESCE(mi.ZMEDIALOCALPATH, '') as media_path,
      COALESCE(mi.ZTITLE, '') as media_caption
    FROM ZWAMESSAGE m
    LEFT JOIN ZWAMEDIAITEM mi ON m.ZMEDIAITEM = mi.Z_PK
    LEFT JOIN ZWAGROUPMEMBER gm ON m.ZGROUPMEMBER = gm.Z_PK
    LEFT JOIN ZWAPROFILEPUSHNAME pn ON pn.ZJID = gm.ZMEMBERJID
    WHERE m.ZCHATSESSION = ${MARKETING_CHAT_SESSION}
      AND m.Z_PK > ${Number(state.lastProcessedPk) || 96744}
    ORDER BY m.Z_PK ASC;
  `;

  const raw = execFileSync('sqlite3', ['-json', WHATSAPP_DB_PATH, sql], {
    encoding: 'utf8'
  }).trim();

  const rows = raw ? JSON.parse(raw) : [];

  // Filter out Dibi's own automated outbound messages & empty protocol rows
  const incoming = rows
    .filter((r) => {
      const t = String(r.text || '').trim();
      if (
        t.startsWith('🫡') ||
        t.startsWith('🤖') ||
        t.startsWith('✅ *Boss') ||
        t.startsWith('📦 *PART 2:') ||
        t.startsWith('Decorbeats-') ||
        t.startsWith('Board-') ||
        t.startsWith('Reel-')
      ) {
        return false;
      }
      if (Number(r.msg_type) === 66 && !t && !r.media_path) {
        return false;
      }
      return true;
    })
    .map((r) => {
      const combinedText = `${r.text || ''} ${r.media_caption || ''}`.trim();
      const mentionsDibi = /\bdibi\b/i.test(combinedText);
      return {
        ...r,
        mentionsDibi
      };
    });

  const mentionsDibiMessages = incoming.filter((m) => m.mentionsDibi);

  if (markAsRead && rows.length > 0) {
    const maxPk = Math.max(...rows.map((r) => Number(r.pk)));
    const updatedHistory = [
      ...(state.conversationHistory || []),
      ...incoming.map((m) => ({
        pk: m.pk,
        time: m.msg_time,
        sender: m.is_from_me ? 'Boss (Ashwarya)' : m.member_jid,
        type: m.msg_type,
        text: m.text,
        media_path: m.media_path,
        media_caption: m.media_caption,
        mentionsDibi: m.mentionsDibi
      }))
    ].slice(-200); // Keep rolling 200 messages of context

    saveState({
      botName: 'Dibi',
      lastProcessedPk: maxPk,
      updatedAt: new Date().toISOString(),
      conversationHistory: updatedHistory
    });
  }

  return {
    botName: 'Dibi',
    lastProcessedPk: state.lastProcessedPk,
    rawCount: rows.length,
    incomingCount: incoming.length,
    shouldRespond: mentionsDibiMessages.length > 0,
    mentionsDibiCount: mentionsDibiMessages.length,
    incoming,
    mentionsDibiMessages,
    recentConversationCount: (state.conversationHistory || []).length + incoming.length
  };
}

const CLICK_COMPOSE_SWIFT = `
import Cocoa
import CoreGraphics

func clickAt(x: Double, y: Double) {
    let pt = CGPoint(x: x, y: y)
    let move = CGEvent(mouseEventSource: nil, mouseType: .mouseMoved, mouseCursorPosition: pt, mouseButton: .left)
    let down = CGEvent(mouseEventSource: nil, mouseType: .leftMouseDown, mouseCursorPosition: pt, mouseButton: .left)
    let up = CGEvent(mouseEventSource: nil, mouseType: .leftMouseUp, mouseCursorPosition: pt, mouseButton: .left)
    move?.post(tap: .cghidEventTap)
    Thread.sleep(forTimeInterval: 0.06)
    down?.post(tap: .cghidEventTap)
    Thread.sleep(forTimeInterval: 0.06)
    up?.post(tap: .cghidEventTap)
}

var targetX = 1520.0
var targetY = 932.0

if let windowList = CGWindowListCopyWindowInfo([.optionOnScreenOnly, .excludeDesktopElements], kCGNullWindowID) as? [[String: Any]] {
    for win in windowList {
        let owner = win[kCGWindowOwnerName as String] as? String ?? ""
        let layer = win[kCGWindowLayer as String] as? Int ?? -1
        if owner.contains("WhatsApp") && layer == 0,
           let bounds = win[kCGWindowBounds as String] as? [String: Double],
           let wx = bounds["X"], let wy = bounds["Y"],
           let ww = bounds["Width"], let wh = bounds["Height"],
           ww > 400 && wh > 400 {
            targetX = wx + ww - 200.0
            targetY = wy + wh - 26.0
            break
        }
    }
}

clickAt(x: targetX, y: targetY)
Thread.sleep(forTimeInterval: 0.4)
`;

export function sendFileToMarketingGroup(filePath) {
  const absPath = path.resolve(filePath);
  if (!fs.existsSync(absPath)) {
    throw new Error(`File not found: ${absPath}`);
  }

  execFileSync(
    'osascript',
    [
      '-e',
      'tell application "/Applications/WhatsApp.localized/WhatsApp.app" to activate',
      '-e',
      'delay 0.8',
      '-e',
      'tell application "System Events" to tell process "WhatsApp" to set frontmost to true',
      '-e',
      'delay 0.4'
    ],
    { stdio: 'inherit' }
  );

  const swiftCode = `
import Cocoa
import CoreGraphics
let fileUrl = URL(fileURLWithPath: ${JSON.stringify(absPath)})
let pb = NSPasteboard.general
pb.clearContents()
pb.writeObjects([fileUrl as NSURL])
` + CLICK_COMPOSE_SWIFT.replace('import Cocoa\nimport CoreGraphics\n', '');

  execFileSync('swift', ['-e', swiftCode], { stdio: 'inherit' });

  execFileSync(
    'osascript',
    [
      '-e',
      'tell application "System Events" to tell process "WhatsApp"',
      '-e',
      'click menu item "Paste" of menu 1 of menu bar item 4 of menu bar 1',
      '-e',
      'delay 1.8',
      '-e',
      'key code 36',
      '-e',
      'delay 2.5',
      '-e',
      'end tell'
    ],
    { stdio: 'inherit' }
  );

  const state = loadState();
  const latestRaw = execFileSync(
    'sqlite3',
    [
      WHATSAPP_DB_PATH,
      `SELECT MAX(Z_PK) FROM ZWAMESSAGE WHERE ZCHATSESSION = ${MARKETING_CHAT_SESSION};`
    ],
    { encoding: 'utf8' }
  ).trim();
  const maxPk = Number(latestRaw) || state.lastProcessedPk;
  saveState({
    ...state,
    lastProcessedPk: maxPk,
    updatedAt: new Date().toISOString()
  });

  return { sentFile: absPath, latestPk: maxPk };
}

export function sendToMarketingGroup(messageText) {
  spawnSync('pbcopy', [], { input: messageText, encoding: 'utf8' });

  execFileSync(
    'osascript',
    [
      '-e',
      'tell application "/Applications/WhatsApp.localized/WhatsApp.app" to activate',
      '-e',
      'delay 0.8',
      '-e',
      'tell application "System Events" to tell process "WhatsApp" to set frontmost to true',
      '-e',
      'delay 0.4'
    ],
    { stdio: 'inherit' }
  );

  execFileSync('swift', ['-e', CLICK_COMPOSE_SWIFT], { stdio: 'inherit' });

  execFileSync(
    'osascript',
    [
      '-e',
      'tell application "System Events" to tell process "WhatsApp"',
      '-e',
      'click menu item "Paste" of menu 1 of menu bar item 4 of menu bar 1',
      '-e',
      'delay 0.6',
      '-e',
      'key code 36',
      '-e',
      'delay 1.5',
      '-e',
      'end tell'
    ],
    { stdio: 'inherit' }
  );

  const state = loadState();
  const latestRaw = execFileSync(
    'sqlite3',
    [
      WHATSAPP_DB_PATH,
      `SELECT MAX(Z_PK) FROM ZWAMESSAGE WHERE ZCHATSESSION = ${MARKETING_CHAT_SESSION};`
    ],
    { encoding: 'utf8' }
  ).trim();
  const maxPk = Number(latestRaw) || state.lastProcessedPk;
  saveState({
    ...state,
    lastProcessedPk: maxPk,
    updatedAt: new Date().toISOString()
  });

  return { sent: true, latestPk: maxPk };
}

const cmd = process.argv[2] || 'check';
if (cmd === 'check') {
  const mark = process.argv.includes('--mark');
  if (!fs.existsSync(STATE_PATH)) {
    saveState(loadState());
  }
  console.log(JSON.stringify(checkNewMessages(mark), null, 2));
} else if (cmd === 'history') {
  console.log(JSON.stringify(loadState(), null, 2));
} else if (cmd === 'send') {
  const msg = process.argv.slice(3).join(' ').trim();
  if (!msg) {
    console.error('Usage: node scripts/whatsapp-boss-bridge.mjs send "<message>"');
    process.exit(1);
  }
  console.log(JSON.stringify(sendToMarketingGroup(msg), null, 2));
} else if (cmd === 'send-file') {
  const filePath = process.argv[3];
  if (!filePath) {
    console.error('Usage: node scripts/whatsapp-boss-bridge.mjs send-file "<filepath>"');
    process.exit(1);
  }
  console.log(JSON.stringify(sendFileToMarketingGroup(filePath), null, 2));
}
