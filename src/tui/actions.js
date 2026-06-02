import { profileKind } from '../profiles.js';

const TOP_WITH_PROFILE = [
  { id: 'switch', label: 'Switch', description: 'Apply to ~/.codex.' },
  { id: 'edit', label: 'Edit', description: 'Open edit actions.' },
  { id: 'rename', label: 'Rename', description: 'Change the name.' },
  { id: 'delete', label: 'Delete', description: 'Remove profile.' },
  { id: 'add', label: 'Add Profile', description: 'Create profile.' },
  { id: 'import', label: 'Import Current', description: 'Capture live state.' },
  { id: 'quit', label: 'Quit', description: 'Leave TUI.' },
];

const TOP_EMPTY = [
  { id: 'add', label: 'Add Profile', description: 'Create profile.' },
  { id: 'import', label: 'Import Current', description: 'Capture live state.' },
  { id: 'quit', label: 'Quit', description: 'Leave TUI.' },
];

const EDIT_OFFICIAL = [
  { id: 'edit-name', label: 'Name', description: 'Rename this profile.' },
  { id: 'edit-auth', label: 'Auth JSON', description: 'Edit auth.json in $EDITOR.' },
  { id: 'back', label: 'Back', description: 'Return to top-level actions.' },
];

const EDIT_CUSTOM = [
  { id: 'edit-name', label: 'Name', description: 'Rename this profile.' },
  { id: 'edit-provider', label: 'Provider Name', description: 'Change model_provider.' },
  { id: 'edit-provider-block', label: 'ProviderBlock TOML', description: 'Edit TOML in $EDITOR.' },
  { id: 'edit-auth', label: 'Auth JSON', description: 'Edit auth.json in $EDITOR.' },
  { id: 'back', label: 'Back', description: 'Return to top-level actions.' },
];

function cloneItems(items) {
  return items.map((item) => ({ ...item, disabled: item.disabled ?? false }));
}

export function buildActionItems({ profile, mode }) {
  if (mode === 'edit-menu') {
    if (!profile) return cloneItems([{ id: 'back', label: 'Back', description: 'Return to top-level actions.' }]);
    return cloneItems(profileKind(profile) === 'official' ? EDIT_OFFICIAL : EDIT_CUSTOM);
  }
  return cloneItems(profile ? TOP_WITH_PROFILE : TOP_EMPTY);
}
