import prisma from '../src/lib/prisma'

async function initStorage() {
  console.log('📦 Inicializando bucket recursos_eventos en Supabase Storage...')
  try {
    await prisma.$executeRawUnsafe(`
      INSERT INTO storage.buckets (id, name, public)
      VALUES ('recursos_eventos', 'recursos_eventos', true)
      ON CONFLICT (id) DO UPDATE SET public = true;
    `)

    // Asegurar políticas públicas de lectura en storage.objects
    await prisma.$executeRawUnsafe(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_policies 
          WHERE tablename = 'objects' AND policyname = 'Acceso Publico Lectura recursos_eventos'
        ) THEN
          CREATE POLICY "Acceso Publico Lectura recursos_eventos"
          ON storage.objects FOR SELECT
          USING (bucket_id = 'recursos_eventos');
        END IF;
      END $$;
    `)

    // Asegurar políticas de inserción
    await prisma.$executeRawUnsafe(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_policies 
          WHERE tablename = 'objects' AND policyname = 'Permitir Insercion recursos_eventos'
        ) THEN
          CREATE POLICY "Permitir Insercion recursos_eventos"
          ON storage.objects FOR INSERT
          WITH CHECK (bucket_id = 'recursos_eventos');
        END IF;
      END $$;
    `)

    const buckets = await prisma.$queryRawUnsafe('SELECT id, name, public FROM storage.buckets')
    console.log('✅ Buckets en Supabase Storage:', buckets)
  } catch (err) {
    console.error('❌ Error al inicializar bucket:', err)
  }
}

initStorage()

