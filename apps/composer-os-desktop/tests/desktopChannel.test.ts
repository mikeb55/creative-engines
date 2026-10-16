import * as os from 'os';
import * as path from 'path';
import {
  DEV_APP_ID,
  DEV_DOCUMENTS_EXPORT_ROOT,
  DEV_PRODUCT_NAME,
  documentsSaveBase,
  parseDesktopChannel,
} from '../electron/desktopChannel';

describe('desktop channel', () => {
  it('treats a missing or other channel as stable', () => {
    expect(parseDesktopChannel(null)).toBe('stable');
    expect(parseDesktopChannel('')).toBe('stable');
    expect(parseDesktopChannel('{')).toBe('stable');
    expect(parseDesktopChannel('{"channel":"stable"}')).toBe('stable');
  });

  it('accepts only an explicit dev channel', () => {
    expect(parseDesktopChannel('{"channel":"dev"}')).toBe('dev');
  });

  it('keeps stable document saves on the historical root and isolates dev saves', () => {
    const documents = path.join(os.homedir(), 'Documents');
    expect(documentsSaveBase(documents, 'stable')).toBe(documents);
    expect(documentsSaveBase(documents, 'dev')).toBe(path.join(documents, DEV_DOCUMENTS_EXPORT_ROOT));
    expect(DEV_APP_ID).toBe('com.mikeb55.composeros.dev');
    expect(DEV_PRODUCT_NAME).toBe('Composer OS DEV');
  });
});
