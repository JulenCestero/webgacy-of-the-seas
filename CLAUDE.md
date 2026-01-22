# Legacy of the Seas - Progreso del Proyecto

## Estado Actual

**Última actualización**: 2026-01-22 19:48

### Issues Completadas
- [x] `legacy-u52` - Inicializar proyecto Astro
- [x] `legacy-a16` - Configurar Tailwind CSS dark mode
- [x] `legacy-91i` - Crear BaseLayout con estructura HTML

### Siguiente Issue
- [ ] `legacy-wv0` - Crear componentes comunes Header/Footer

### Epic SETUP (legacy-381)
Falta solo `legacy-wv0` para completar el epic de SETUP.

---

## Procedimiento para Cada Issue

### Comando para Continuar
```bash
bd ready && bd show legacy-wv0
```

### Flujo de Trabajo por Issue

```bash
# 1. Ver issue disponible y reclamarla
bd show <issue-id>
bd update <issue-id> --status=in_progress

# 2. Implementar la funcionalidad
# ... escribir código ...

# 3. Verificar que funciona
export PATH="$PATH:/c/Program Files/nodejs"
npm run build

# 4. Documentar cambios en docs/setup.md si aplica

# 5. Commit
git add <archivos>
git commit -m "feat: descripción

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"

# 6. Cerrar issue
bd close <issue-id> --reason="Descripción de lo completado"

# 7. Actualizar CLAUDE.md con progreso
```

---

## Detalles de Issue Pendiente: legacy-wv0

**Título**: Crear componentes comunes Header/Footer

**Descripción**: Componentes reutilizables con navegación, logo placeholder, links sociales base

**Archivos a crear**:
- `src/components/Header.astro` - Logo, navegación (Home, Conciertos, Nosotros, Contacto)
- `src/components/Footer.astro` - Copyright, links sociales placeholder

**Después de completar**:
1. Actualizar `BaseLayout.astro` para incluir Header y Footer
2. Verificar build
3. Cerrar `legacy-wv0`
4. Cerrar epic `legacy-381` (SETUP completo)

---

## Estructura del Proyecto

```
src/
├── components/
│   ├── Header.astro    # TODO
│   └── Footer.astro    # TODO
├── content/
│   ├── members/        # Colección miembros
│   └── concerts/       # Colección conciertos
├── layouts/
│   └── BaseLayout.astro ✓
├── pages/
│   └── index.astro ✓
└── styles/
    └── global.css ✓
```

---

## Notas Técnicas

### PATH de Node.js
En bash de Claude Code, usar:
```bash
export PATH="$PATH:/c/Program Files/nodejs"
```

### Commits
Siempre incluir co-author:
```
Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
```

### Colores de la Banda
- `band-dark`: #0a0a0a (fondo)
- `band-red`: #8b0000 (acentos)
- `band-gold`: #d4af37 (detalles)

---

## Proceso de Validación por Issue

### Pasos Obligatorios
1. **Verificar que funciona**: Ejecutar `npm run build` y/o `npm run dev`
2. **Tomar screenshot**: Usar Playwright para capturar validación visual en `validations/`
3. **Hacer commit**: Con co-author de Claude
4. **Cerrar issue**: `bd close <issue-id> --reason="..."`
5. **Compactar contexto**: Si el contexto es muy largo

### Carpeta de Validaciones
```
validations/
├── legacy-wv0-header-footer.png
├── legacy-xxx-feature.png
└── ...
```
