-- CreateTable
CREATE TABLE "configuracion_plantillas" (
    "id" TEXT NOT NULL DEFAULT 'global_config',
    "logo_url" TEXT NOT NULL DEFAULT '/imagen_2.png',
    "firma_decano_url" TEXT,
    "nombre_decano" TEXT NOT NULL DEFAULT 'Ing. Roberto Gómez',
    "cargo_firmante" TEXT NOT NULL DEFAULT 'Decano de Ingenierías',
    "color_primario" TEXT NOT NULL DEFAULT '#0B305B',
    "color_secundario" TEXT NOT NULL DEFAULT '#D2202E',
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "configuracion_plantillas_pkey" PRIMARY KEY ("id")
);
