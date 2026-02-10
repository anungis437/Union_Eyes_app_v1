import { Pool } from 'https://deno.land/x/postgres@v0.19.3/mod.ts';

type QueryResult<T> = {
  rows: T[];
  rowCount: number | null;
};

const databaseUrl = Deno.env.get('DATABASE_URL');
if (!databaseUrl) {
  throw new Error('DATABASE_URL is not set for Azure Postgres access.');
}

const pool = new Pool(databaseUrl, 3, true);

export async function dbQuery<T = Record<string, unknown>>(
  text: string,
  args: Array<unknown> = []
): Promise<QueryResult<T>> {
  const client = await pool.connect();
  try {
    const result = await client.queryObject<T>({ text, args });
    return { rows: result.rows, rowCount: result.rowCount };
  } finally {
    client.release();
  }
}
