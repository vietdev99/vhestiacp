import { execSync, exec } from 'child_process';

const HESTIA = process.env.HESTIA || '/usr/local/hestia';
const HESTIA_BIN = `${HESTIA}/bin`;

// Environment variables needed for Hestia scripts
const HESTIA_ENV = {
  ...process.env,
  HESTIA: HESTIA,
  PATH: `${HESTIA_BIN}:${process.env.PATH || '/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin'}`
};

/**
 * Execute Hestia command synchronously
 * @param {string} cmd - Command name (e.g., 'v-list-users')
 * @param {string[]} args - Command arguments
 * @returns {string} Command output
 */
export function execHestiaSync(cmd, args = []) {
  const fullCmd = `${HESTIA_BIN}/${cmd} ${args.map(a => `'${a}'`).join(' ')}`;
  try {
    return execSync(fullCmd, { encoding: 'utf8', maxBuffer: 50 * 1024 * 1024, env: HESTIA_ENV });
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
      timeout: options.timeout || 120000, // Default 2 minutes
      env: HESTIA_ENV
    };
    exec(fullCmd, execOptions, (error, stdout, stderr) => {
      if (error) {
        // Check if it's a non-zero exit code or just stderr output
        // Some scripts output warnings to stderr but still succeed
        if (error.code !== undefined && error.code !== 0) {
          // Real error - non-zero exit code
          const errorOutput = stderr || stdout || error.message;
          reject(new Error(errorOutput.trim()));
        } else if (error.killed) {
          // Process was killed (timeout)
          reject(new Error('Command timed out'));
        } else {
          // Other error (e.g., command not found)
          const errorOutput = stderr || stdout || error.message;
          reject(new Error(errorOutput.trim()));
        }
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
