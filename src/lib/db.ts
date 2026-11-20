import { createClient, SupabaseClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { Branch, Patient, Template, Language } from './types';

// Check if Supabase is properly configured in environment
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseServiceKey &&
  supabaseUrl.startsWith('http') &&
  !supabaseUrl.includes('your-project')
);

let supabaseServerClient: SupabaseClient | null = null;
if (isSupabaseConfigured) {
  supabaseServerClient = createClient(supabaseUrl!, supabaseServiceKey!, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

// In-memory cache for branches (eliminates extra round-trips to Supabase)
let cachedBranches: Branch[] | null = null;
let cacheExpiry = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export function invalidateBranchCache() {
  cachedBranches = null;
  cacheExpiry = 0;
}

// Fallback Local File Storage path (ensures zero crashes if Supabase credentials are not connected)
const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'local-store.json');

interface LocalStore {
  branches: Branch[];
  patients: Patient[];
  templates: Template[];
}

const DEFAULT_STORE: LocalStore = {
  branches: [
    {
      id: 'b1111111-1111-1111-1111-111111111111',
      name: 'Kunnamangalam',
      review_link: 'https://search.google.com/local/writereview?placeid=ChIJWy50EdNdpjsR4vFgODmfdh8',
      created_at: new Date().toISOString(),
    },
    {
      id: 'b2222222-2222-2222-2222-222222222222',
      name: 'Malappuram',
      review_link: 'https://search.google.com/local/writereview?placeid=ChIJ7VJ-NwBLpjsRptYYI9zGaHo',
      created_at: new Date().toISOString(),
    },
  ],
  patients: [],
  templates: [
    {
      language: 'en',
      body: 'Hello {name}, thank you for visiting Medimall {branch}. Your feedback means a lot to us. Could you please take a minute to share your experience on Google? {review_link}',
      updated_at: new Date().toISOString(),
    },
    {
      language: 'ml',
      body: 'നമസ്കാരം {name}, Medimall {branch} സന്ദർശിച്ചതിന് നന്ദി. താങ്കളുടെ അഭിപ്രായം ഞങ്ങൾക്ക് വളരെ വിലപ്പെട്ടതാണ്. ദയവായി ഒരു ഗൂഗിൾ റിവ്യൂ നൽകാമോ? {review_link}',
      updated_at: new Date().toISOString(),
    },
  ],
};

function readLocalStore(): LocalStore {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(DB_FILE)) {
      fs.writeFileSync(DB_FILE, JSON.stringify(DEFAULT_STORE, null, 2), 'utf-8');
      return DEFAULT_STORE;
    }
    const data = fs.readFileSync(DB_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (err) {
    console.error('Error reading local store fallback:', err);
    return DEFAULT_STORE;
  }
}

function writeLocalStore(store: LocalStore) {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(DB_FILE, JSON.stringify(store, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error writing local store fallback:', err);
  }
}

// ----------------- Branches API (Fast with Caching) -----------------

export async function getBranches(): Promise<Branch[]> {
  const now = Date.now();
  if (cachedBranches && now < cacheExpiry) {
    return cachedBranches;
  }

  if (supabaseServerClient) {
    const { data, error } = await supabaseServerClient
      .from('branches')
      .select('*')
      .order('name', { ascending: true });
    if (!error && data) {
      cachedBranches = data as Branch[];
      cacheExpiry = now + CACHE_TTL_MS;
      return cachedBranches;
    }
    console.warn('Supabase getBranches error, falling back to local store:', error?.message);
  }

  const store = readLocalStore();
  const list = store.branches.sort((a, b) => a.name.localeCompare(b.name));
  cachedBranches = list;
  cacheExpiry = now + CACHE_TTL_MS;
  return list;
}

export async function getBranchById(id: string): Promise<Branch | null> {
  const branches = await getBranches();
  return branches.find((b) => b.id === id) || null;
}

export async function addBranch(name: string, review_link: string): Promise<Branch> {
  const cleanName = name.trim();
  const cleanLink = review_link.trim();
  invalidateBranchCache();

  if (supabaseServerClient) {
    const { data, error } = await supabaseServerClient
      .from('branches')
      .insert({ name: cleanName, review_link: cleanLink })
      .select()
      .single();
    if (!error && data) {
      return data as Branch;
    }
    console.warn('Supabase addBranch error, using local store:', error?.message);
  }

  const store = readLocalStore();
  const existing = store.branches.find(
    (b) => b.name.toLowerCase() === cleanName.toLowerCase()
  );
  if (existing) {
    throw new Error(`Branch with name "${cleanName}" already exists.`);
  }

  const newBranch: Branch = {
    id: 'branch_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
    name: cleanName,
    review_link: cleanLink,
    created_at: new Date().toISOString(),
  };
  store.branches.push(newBranch);
  writeLocalStore(store);
  return newBranch;
}

export async function updateBranch(id: string, name: string, review_link: string): Promise<Branch> {
  const cleanName = name.trim();
  const cleanLink = review_link.trim();
  invalidateBranchCache();

  if (supabaseServerClient) {
    const { data, error } = await supabaseServerClient
      .from('branches')
      .update({ name: cleanName, review_link: cleanLink })
      .eq('id', id)
      .select()
      .single();
    if (!error && data) {
      return data as Branch;
    }
    console.warn('Supabase updateBranch error, using local store:', error?.message);
  }

  const store = readLocalStore();
  const index = store.branches.findIndex((b) => b.id === id);
  if (index === -1) {
    throw new Error('Branch not found');
  }
  store.branches[index].name = cleanName;
  store.branches[index].review_link = cleanLink;
  writeLocalStore(store);
  return store.branches[index];
}

export async function deleteBranch(id: string): Promise<void> {
  invalidateBranchCache();
  if (supabaseServerClient) {
    const { error } = await supabaseServerClient.from('branches').delete().eq('id', id);
    if (!error) return;
    console.warn('Supabase deleteBranch error, using local store:', error?.message);
  }

  const store = readLocalStore();
  store.branches = store.branches.filter((b) => b.id !== id);
  writeLocalStore(store);
}

// ----------------- Templates API -----------------

export async function getTemplates(): Promise<Template[]> {
  if (supabaseServerClient) {
    const { data, error } = await supabaseServerClient.from('templates').select('*');
    if (!error && data && data.length > 0) {
      return data as Template[];
    }
    console.warn('Supabase getTemplates error, falling back to local store:', error?.message);
  }
  const store = readLocalStore();
  return store.templates;
}

export async function getTemplate(lang: Language): Promise<string> {
  const templates = await getTemplates();
  const found = templates.find((t) => t.language === lang);
  if (found) return found.body;
  return lang === 'ml' ? DEFAULT_STORE.templates[1].body : DEFAULT_STORE.templates[0].body;
}

export async function updateTemplate(language: Language, body: string): Promise<Template> {
  const cleanBody = body.trim();
  const now = new Date().toISOString();

  if (supabaseServerClient) {
    const { data, error } = await supabaseServerClient
      .from('templates')
      .upsert({ language, body: cleanBody, updated_at: now })
      .select()
      .single();
    if (!error && data) {
      return data as Template;
    }
    console.warn('Supabase updateTemplate error, using local store:', error?.message);
  }

  const store = readLocalStore();
  const index = store.templates.findIndex((t) => t.language === language);
  if (index >= 0) {
    store.templates[index].body = cleanBody;
    store.templates[index].updated_at = now;
  } else {
    store.templates.push({ language, body: cleanBody, updated_at: now });
  }
  writeLocalStore(store);
  return { language, body: cleanBody, updated_at: now };
}

// ----------------- Patients API (Optimized for High Speed) -----------------

export async function getPatients(search?: string): Promise<Patient[]> {
  if (supabaseServerClient) {
    // Single optimized query joining branches table directly in PostgreSQL
    let query = supabaseServerClient
      .from('patients')
      .select('id, name, phone, branch_id, visit_time, sent_at, sent_language, created_at, branches(name, review_link)')
      .order('visit_time', { ascending: false });

    if (search && search.trim()) {
      const q = search.trim();
      query = query.or(`name.ilike.%${q}%,phone.ilike.%${q}%`);
    }

    const { data, error } = await query;
    if (!error && data) {
      return data.map((item: any) => ({
        id: item.id,
        name: item.name,
        phone: item.phone,
        branch_id: item.branch_id,
        branch_name: item.branches?.name || 'Medimall',
        review_link: item.branches?.review_link || '',
        visit_time: item.visit_time,
        sent_at: item.sent_at,
        sent_language: item.sent_language,
        created_at: item.created_at,
      }));
    }
    console.warn('Supabase getPatients error, falling back to local store:', error?.message);
  }

  const branches = await getBranches();
  const branchMap = new Map(branches.map((b) => [b.id, b]));
  const store = readLocalStore();
  let list = store.patients.map((p) => {
    const branch = branchMap.get(p.branch_id);
    return {
      ...p,
      branch_name: branch?.name || 'Medimall',
      review_link: branch?.review_link || '',
    };
  });

  if (search && search.trim()) {
    const q = search.trim().toLowerCase();
    list = list.filter(
      (p) => p.name.toLowerCase().includes(q) || p.phone.includes(q)
    );
  }

  list.sort((a, b) => new Date(b.visit_time).getTime() - new Date(a.visit_time).getTime());
  return list;
}

export async function addPatient(patient: {
  name: string;
  phone: string;
  branch_id: string;
  visit_time: string;
}): Promise<Patient> {
  const now = new Date().toISOString();

  if (supabaseServerClient) {
    // Single query returning the newly created patient record with joined branch name in one round-trip
    const { data, error } = await supabaseServerClient
      .from('patients')
      .insert({
        name: patient.name.trim(),
        phone: patient.phone.trim(),
        branch_id: patient.branch_id,
        visit_time: patient.visit_time,
        created_at: now,
      })
      .select('id, name, phone, branch_id, visit_time, sent_at, sent_language, created_at, branches(name, review_link)')
      .single();

    if (!error && data) {
      return {
        id: data.id,
        name: data.name,
        phone: data.phone,
        branch_id: data.branch_id,
        branch_name: (data.branches as any)?.name || 'Medimall',
        review_link: (data.branches as any)?.review_link || '',
        visit_time: data.visit_time,
        sent_at: data.sent_at,
        sent_language: data.sent_language,
        created_at: data.created_at,
      };
    }
    console.warn('Supabase addPatient error, using local store:', error?.message);
  }

  const branches = await getBranches();
  const branch = branches.find((b) => b.id === patient.branch_id);
  const store = readLocalStore();
  const newPatient: Patient = {
    id: 'pat_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
    name: patient.name.trim(),
    phone: patient.phone.trim(),
    branch_id: patient.branch_id,
    branch_name: branch?.name || 'Medimall',
    review_link: branch?.review_link || '',
    visit_time: patient.visit_time,
    sent_at: null,
    sent_language: null,
    created_at: now,
  };
  store.patients.unshift(newPatient);
  writeLocalStore(store);
  return newPatient;
}

export async function addPatientsBatch(
  patients: Array<{
    name: string;
    phone: string;
    branch_id: string;
    visit_time: string;
  }>
): Promise<{ count: number; patients: Patient[] }> {
  if (patients.length === 0) return { count: 0, patients: [] };
  const now = new Date().toISOString();

  if (supabaseServerClient) {
    const records = patients.map((p) => ({
      name: p.name.trim(),
      phone: p.phone.trim(),
      branch_id: p.branch_id,
      visit_time: p.visit_time,
      created_at: now,
    }));

    // Batch insert up to 1000 rows in a single Postgres execution
    const { data, error } = await supabaseServerClient
      .from('patients')
      .insert(records)
      .select('id, name, phone, branch_id, visit_time, sent_at, sent_language, created_at, branches(name, review_link)');

    if (!error && data) {
      const inserted: Patient[] = data.map((item: any) => ({
        id: item.id,
        name: item.name,
        phone: item.phone,
        branch_id: item.branch_id,
        branch_name: item.branches?.name || 'Medimall',
        review_link: item.branches?.review_link || '',
        visit_time: item.visit_time,
        sent_at: item.sent_at,
        sent_language: item.sent_language,
        created_at: item.created_at,
      }));
      return { count: inserted.length, patients: inserted };
    }
    console.warn('Supabase addPatientsBatch error, using local store:', error?.message);
  }

  const branches = await getBranches();
  const branchMap = new Map(branches.map((b) => [b.id, b]));
  const store = readLocalStore();

  const newRecords: Patient[] = patients.map((p, idx) => ({
    id: 'pat_' + (Date.now() + idx) + '_' + Math.random().toString(36).substring(2, 7),
    name: p.name.trim(),
    phone: p.phone.trim(),
    branch_id: p.branch_id,
    branch_name: branchMap.get(p.branch_id)?.name || 'Medimall',
    review_link: branchMap.get(p.branch_id)?.review_link || '',
    visit_time: p.visit_time,
    sent_at: null,
    sent_language: null,
    created_at: now,
  }));

  store.patients = [...newRecords, ...store.patients];
  writeLocalStore(store);
  return { count: newRecords.length, patients: newRecords };
}

export async function markPatientSent(
  id: string,
  sent_language: Language
): Promise<Patient> {
  const sent_at = new Date().toISOString();

  if (supabaseServerClient) {
    const { data, error } = await supabaseServerClient
      .from('patients')
      .update({ sent_at, sent_language })
      .eq('id', id)
      .select('id, name, phone, branch_id, visit_time, sent_at, sent_language, created_at, branches(name, review_link)')
      .single();

    if (!error && data) {
      return {
        id: data.id,
        name: data.name,
        phone: data.phone,
        branch_id: data.branch_id,
        branch_name: (data.branches as any)?.name,
        review_link: (data.branches as any)?.review_link,
        visit_time: data.visit_time,
        sent_at: data.sent_at,
        sent_language: data.sent_language,
        created_at: data.created_at,
      };
    }
    console.warn('Supabase markPatientSent error, using local store:', error?.message);
  }

  const store = readLocalStore();
  const index = store.patients.findIndex((p) => p.id === id);
  if (index === -1) {
    throw new Error('Patient not found');
  }

  store.patients[index].sent_at = sent_at;
  store.patients[index].sent_language = sent_language;
  writeLocalStore(store);
  return store.patients[index];
}
