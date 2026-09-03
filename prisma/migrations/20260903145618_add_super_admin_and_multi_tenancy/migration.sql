-- AlterEnum
ALTER TYPE "RolUsuario" ADD VALUE 'SUPER_ADMIN';

-- AlterTable
ALTER TABLE "eventos" ADD COLUMN     "programa_academico" TEXT DEFAULT 'Facultad de Ingenierías';
