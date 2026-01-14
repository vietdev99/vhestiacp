import { execSync, exec } from 'child_process';

const HESTIA_BIN = '/usr/local/hestia/bin';

/**
 * Execute Hestia command synchronously
 * @param {string} cmd - Command name (e.g., 'v-list-users')
 * @param {string[]} args - Command arguments
 * @returns {string} Command output
 */
export function execHestiaSync(cmd, args = []) {
  const fullCmd = `${HESTIA_BIN}/${cmd} ${args.map(a => `'${a}'`).join(' ')}`;
  try {
    return execSync(fullCmd, { encoding: 'utf8', maxBuffer: 50 * 1024 * 1024 });
  } catch (error) {
    throw new Error(`Command failed: ${error.message}`);
  }
}

/**
 * Execute Hestia command asynchronously
 * @param {string} cmd - Command name
 * @param {string[]} args - Command arguments
 * @param {object} options - Options like timeout
 * @returns {Promise<string>} Command output
 */
export function execHestia(cmd, args = [], options = {}) {
  return new Promise((resolve, reject) => {
    const fullCmd = `${HESTIA_BIN}/${cmd} ${args.map(a => `'${a}'`).join(' ')}`;
    const execOptions = {
      maxBuffer: 50 * 1024 * 1024,
      timeout: options.timeout || 120000 // Default 2 minutes
    };
    exec(fullCmd, execOptions, (error, stdout, stderr) => {
      if (error) {
        reject(new Error(stderr || error.message));
      } else {
        resolve(stdout);
      }
    });
  });
}

/**
 * Execute Hestia command and parse JSON output
 * @param {string} cmd - Command name
 * @param {string[]} args - Command arguments (json format will be added)
 * @returns {Promise<object>} Parsed JSON data
 */
export async function execHestiaJson(cmd, args = []) {
  const output = await execHestia(cmd, [...args, 'json']);
  try {
    return JSON.parse(output);
  } catch {
    return {};
  }
}

/**
 * Check if command executed successfully
 * @param {string} cmd - Command name
 * @param {string[]} args - Command arguments
 * @returns {Promise<boolean>}
 */
export async function execHestiaCheck(cmd, args = []) {
  try {
    await execHestia(cmd, args);
    return true;
  } catch {
    return false;
  }
}
