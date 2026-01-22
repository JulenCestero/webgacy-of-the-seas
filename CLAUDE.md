# Legacy of the Seas - Progreso del Proyecto

## Estado Actual

**Última actualización**: 2026-01-22 21:20

### Issues Completadas
- [x] `legacy-u52` - Inicializar proyecto Astro
- [x] `legacy-a16` - Configurar Tailwind CSS dark mode
- [x] `legacy-91i` - Crear BaseLayout con estructura HTML
- [x] `legacy-wv0` - Crear componentes comunes Header/Footer

### Epic SETUP (legacy-381) - COMPLETADO
Todas las tareas del epic SETUP han sido completadas.

### Siguiente Issue
- [ ] `legacy-y2i` - Página Home con Hero (priority 1)

---

## Procedimiento para Cada Issue

### Comando para Continuar
```bash
bd ready && bd show legacy-y2i
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

## Detalles de Issue Pendiente: legacy-y2i

**Título**: Página Home con Hero

**Descripción**: Landing page con hero visual, título banda, CTAs (Escuchar, Próximo Concierto), preview conciertos

**Archivos a modificar/crear**:
- `src/pages/index.astro` - Hero section con título, descripción y CTAs
- Posiblemente componente Hero.astro separado

**Dependencias**:
- Bloqueada por: `legacy-wv0` ✅ (completada)

---

## Estructura del Proyecto

```
src/
├── components/
│   ├── Header.astro    ✓
│   └── Footer.astro    ✓
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

## Proceso de Validación por Issue (OBLIGATORIO)

### Flujo de Cierre de Issue
**SIEMPRE seguir estos 4 pasos en orden:**

1. **VALIDACIÓN**
   - Ejecutar `npm run build` para verificar que compila
   - Ejecutar `npm run dev` y abrir en navegador
   - Tomar screenshot con Playwright → guardar en `validations/`

2. **COMMIT**
   - `git add <archivos específicos>`
   - `git commit -m "feat: descripción\n\nCo-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"`

3. **CERRAR BEAD**
   - Editar `.beads/issues.jsonl` directamente
   - Cambiar `"status":"open"` → `"status":"closed"`
   - Añadir `"closed_at"` y `"close_reason"`
   - Actualizar CLAUDE.md con progreso

4. **LIMPIAR CONTEXTO**
   - Compactar si el contexto es muy largo
   - Usar `/compact` si es necesario

### Carpeta de Validaciones
```
validations/
├── legacy-wv0-header-footer.png
├── legacy-xxx-feature.png
└── ...
```
