-- AlterTable
ALTER TABLE "eventos" ADD COLUMN     "logo_fondo_url" TEXT,
ADD COLUMN     "sponsors_url" TEXT;

-- AlterTable
ALTER TABLE "usuarios" ADD COLUMN     "cedula" TEXT,
ADD COLUMN     "semestre" TEXT;
