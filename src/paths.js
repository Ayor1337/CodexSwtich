import os from 'node:os';
import path from 'node:path';

const HOME = os.homedir();
const XDG_CONFIG_HOME = process.env.XDG_CONFIG_HOME || path.join(HOME, '.config');

export const CODEX_DIR = path.join(HOME, '.codex');
export const AUTH = path.join(CODEX_DIR, 'auth.json');
export const CONFIG = path.join(CODEX_DIR, 'config.toml');

export const CSW_DIR = path.join(XDG_CONFIG_HOME, 'csw');
export const PROFILES = path.join(CSW_DIR, 'profiles.json');
export const BACKUPS = path.join(CSW_DIR, 'backups');
