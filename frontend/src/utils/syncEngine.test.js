import api from '../api/apiClient';
import { getSyncQueue, removeSyncQueueItem, getSyncQueueCount, getCachedData, setCachedData } from './indexedDB';

jest.mock('../api/apiClient', () => ({ __esModule: true, default: jest.fn() }));
jest.mock('./indexedDB', () => ({
  getSyncQueue: jest.fn(),
  removeSyncQueueItem: jest.fn(),
  getSyncQueueCount: jest.fn(),
  getCachedData: jest.fn(),
  setCachedData: jest.fn(),
}));

let engine;
let queue;
let online;
let onlineSpy;

const operation = (id, type, endpoint, payload = {}, tempId) => ({ id, type, endpoint, payload, tempId, method: 'POST' });

beforeAll(() => {
  jest.useFakeTimers();
  engine = require('./syncEngine').default;
  onlineSpy = jest.spyOn(navigator, 'onLine', 'get').mockImplementation(() => online);
  jest.spyOn(console, 'info').mockImplementation(() => {});
  jest.spyOn(console, 'warn').mockImplementation(() => {});
});

beforeEach(() => {
  jest.clearAllMocks();
  queue = [];
  online = true;
  onlineSpy.mockImplementation(() => online);
  engine.tempIdMap = {};
  engine.lastError = null;
  localStorage.clear();
  getSyncQueue.mockImplementation(async () => [...queue]);
  getSyncQueueCount.mockImplementation(async () => queue.length);
  removeSyncQueueItem.mockImplementation(async (id) => { queue = queue.filter((item) => item.id !== id); });
  getCachedData.mockResolvedValue([]);
  setCachedData.mockResolvedValue(true);
});

afterAll(() => {
  onlineSpy.mockRestore();
  jest.restoreAllMocks();
  jest.clearAllTimers();
  jest.useRealTimers();
});

test('concurrent sync triggers send each pending operation once', async () => {
  queue = [operation('1', 'CREATE_VISIT', '/visits', {}, 'temp_visit_1')];
  api.mockResolvedValue({ data: { visit: { visit_id: 51 } } });

  await Promise.all([engine.syncAll(), engine.syncAll()]);

  expect(api).toHaveBeenCalledTimes(1);
  expect(queue).toEqual([]);
  expect(engine.isSyncing).toBe(false);
});

test('returning online uploads related records, then visit completion using real IDs', async () => {
  queue = [
    operation('1', 'CREATE_CITY', '/cities', { name: 'City' }, 'temp_city_1'),
    operation('2', 'CREATE_DOCTOR', '/doctors', { name: 'Doctor' }, 'temp_doc_1'),
    operation('3', 'CREATE_CLINIC', '/clinics', { city_id: 'temp_city_1' }, 'temp_clinic_1'),
    operation('4', 'CREATE_PLAN', '/visit-plans', { doctor_id: 'temp_doc_1', clinic_id: 'temp_clinic_1' }, 'temp_plan_1'),
    operation('5', 'CREATE_VISIT', '/visits', { doctor_id: 'temp_doc_1', clinic_id: 'temp_clinic_1' }, 'temp_visit_1'),
    operation('6', 'COMPLETE_VISIT', '/visits/temp_visit_1/complete', { outcome: 'completed', notes: 'Offline notes', exit_at: '2026-10-03T12:00:00Z' }),
  ];
  api.mockImplementation(async ({ url }) => ({ data: url === '/visits' ? { visit: { visit_id: 51 } } : { id: 10 + api.mock.calls.length } }));
  online = false;
  await engine.syncAll();
  expect(api).not.toHaveBeenCalled();

  const finished = new Promise((resolve) => {
    const unsubscribe = engine.subscribe((event) => {
      if (event.type === 'SYNC_FINISHED') { unsubscribe(); resolve(event); }
    });
  });
  online = true;
  window.dispatchEvent(new Event('online'));
  await finished;

  expect(api).toHaveBeenNthCalledWith(3, expect.objectContaining({ url: '/clinics', data: { city_id: '11' } }));
  expect(api).toHaveBeenNthCalledWith(4, expect.objectContaining({ url: '/visit-plans', data: { doctor_id: '12', clinic_id: '13' } }));
  expect(api).toHaveBeenNthCalledWith(5, expect.objectContaining({ url: '/visits', data: { doctor_id: '12', clinic_id: '13' } }));
  expect(api).toHaveBeenNthCalledWith(6, expect.objectContaining({ url: '/visits/51/complete', data: expect.objectContaining({ notes: 'Offline notes', outcome: 'completed' }) }));
  expect(queue).toEqual([]);
});

test('an expired session preserves every operation and retries after login succeeds', async () => {
  queue = [operation('1', 'SHARE_LOCATION', '/visits/51/share-location'), operation('2', 'COMPLETE_VISIT', '/visits/51/complete')];
  api.mockRejectedValue({ response: { status: 401, data: { message: 'Unauthorized' } } });
  const result = await engine.syncAll();

  expect(api).toHaveBeenCalledTimes(1);
  expect(result.remainingCount).toBe(2);
  expect(engine.lastError.status).toBe(401);
  expect(engine.lastError.message).toContain('سجّل الدخول');

  api.mockResolvedValue({ data: { visit: { visit_id: 51 } } });
  await engine.syncAll();
  expect(queue).toEqual([]);
});

test('a failed parent stays queued and its dependent visit is not sent with temporary IDs', async () => {
  queue = [
    operation('1', 'CREATE_DOCTOR', '/doctors', { name: 'Doctor' }, 'temp_doc_1'),
    operation('2', 'CREATE_VISIT', '/visits', { doctor_id: 'temp_doc_1', clinic_id: 3 }, 'temp_visit_1'),
    operation('3', 'SHARE_LOCATION', '/visits/51/share-location'),
  ];
  api.mockImplementation(async ({ url }) => {
    if (url === '/doctors') throw Object.assign(new Error('Database unavailable'), { response: { status: 500, data: { message: 'Database unavailable' } } });
    return { data: { visit: { visit_id: 51 } } };
  });

  await engine.syncAll();

  expect(api).toHaveBeenCalledTimes(2);
  expect(api.mock.calls.some(([request]) => request.url === '/visits')).toBe(false);
  expect(queue.map((item) => item.id)).toEqual(['1', '2']);
  expect(engine.lastError.message).toBe('Database unavailable');
});

test('storage failures release the sync lock so a later retry can proceed', async () => {
  queue = [operation('1', 'COMPLETE_VISIT', '/visits/51/complete')];
  getSyncQueue.mockRejectedValueOnce(new Error('Storage unavailable'));
  await engine.syncAll();
  expect(engine.isSyncing).toBe(false);

  api.mockResolvedValue({ data: { visit: { visit_id: 51 } } });
  await engine.syncAll();
  expect(queue).toEqual([]);
});

test('a queue-count failure ends the loading state and reports the error', async () => {
  queue = [operation('1', 'COMPLETE_VISIT', '/visits/51/complete')];
  api.mockResolvedValue({ data: { visit: { visit_id: 51 } } });
  getSyncQueueCount.mockRejectedValueOnce(new Error('Cannot read queue count'));
  const listener = jest.fn();
  const unsubscribe = engine.subscribe(listener);

  await engine.syncAll();
  unsubscribe();

  expect(engine.isSyncing).toBe(false);
  expect(listener).toHaveBeenLastCalledWith(expect.objectContaining({
    type: 'SYNC_FINISHED',
    error: expect.objectContaining({ message: 'Cannot read queue count' }),
  }));
});

test('a success page without a created record does not discard the pending operation', async () => {
  queue = [operation('1', 'CREATE_DOCTOR', '/doctors', { name: 'Doctor' }, 'temp_doc_1')];
  api.mockResolvedValue({ data: '<html>App</html>' });

  await engine.syncAll();

  expect(queue).toHaveLength(1);
  expect(removeSyncQueueItem).not.toHaveBeenCalled();
});

test('network interruption retains changes for the next automatic retry', async () => {
  queue = [operation('1', 'COMPLETE_VISIT', '/visits/51/complete')];
  api.mockRejectedValue({ code: 'ERR_NETWORK', message: 'Network Error' });
  await engine.syncAll();
  expect(queue).toHaveLength(1);
  expect(engine.isSyncing).toBe(false);

  api.mockResolvedValue({ data: { visit: { visit_id: 51 } } });
  jest.advanceTimersByTime(30000);
  // Await the completion event rather than a timer-dependent sleep.
  await new Promise((resolve) => {
    const unsubscribe = engine.subscribe((event) => {
      if (event.type === 'SYNC_FINISHED') { unsubscribe(); resolve(); }
    });
  });
  expect(queue).toEqual([]);
});
