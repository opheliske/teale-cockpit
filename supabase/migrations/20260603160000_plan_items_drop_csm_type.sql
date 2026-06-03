-- ─────────────────────────────────────────────────────────────────────────────
-- Plan items — suppression du type "csm" ("Point CSM")
-- ─────────────────────────────────────────────────────────────────────────────
-- Le type "Point CSM" n'est plus proposé à la création / édition d'un jalon
-- du plan annuel. Les jalons existants stockés dans plan_state.items (JSONB)
-- avec type='csm' sont migrés en type='custom' pour rester cohérents avec
-- le type TypeScript narrowed (PlanItemType sans "csm").
-- L'icône par défaut "📞" est préservée par item s'il en avait une — sinon
-- on prend "⚡" (icône par défaut du type custom).

update public.plan_state
   set items = (
     select jsonb_agg(
       case
         when (i->>'type') = 'csm' then
           jsonb_set(
             jsonb_set(i, '{type}', '"custom"'::jsonb, true),
             '{icon}',
             to_jsonb(coalesce(nullif(i->>'icon', ''), '⚡')),
             true
           )
         else i
       end
     )
     from jsonb_array_elements(items) as i
   )
 where items @> '[{"type":"csm"}]'::jsonb;
