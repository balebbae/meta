'use client';
/** HTML controls for the selected asset: customization, animation, view and export. Every control is a real button or input. */
import {useState} from 'react';
import {C} from '@/lib/kingdom/palette';
import {HAIR_COLORS} from '@/lib/kingdom/factories/hero';
import type {Accessory, AnimState, AssetDef, Gender, HairStyle, Rig, Variant} from '@/lib/kingdom/types';
import type {Difficulty} from '@/lib/kingdom/difficulty';
import {exportGLB, type ExportReport} from './export';
import {useKingdom, type CameraPreset, type Environment, type ShadowQuality} from './store';
import styles from './kingdom.module.css';

const hex = (n: number): string => `#${n.toString(16).padStart(6, '0')}`;
const GENDERS: {id: Gender; label: string}[] = [{id: 'masc', label: 'Masc'}, {id: 'fem', label: 'Fem'}, {id: 'neutral', label: 'Neutral'}];
const HAIR: HairStyle[] = ['short', 'pony', 'braid', 'bun', 'curls', 'none'];
const ACCESSORIES: Accessory[] = ['none', 'plume', 'flower', 'scarf'];
const VARIANTS: {id: Variant; label: string}[] = [{id: 'small', label: 'Small'}, {id: 'medium', label: 'Medium'}, {id: 'boss', label: 'Boss'}];
const PRESETS: {id: CameraPreset; label: string}[] = [{id: 'front', label: 'Front'}, {id: 'side', label: 'Side'}, {id: 'threeQuarter', label: '¾ view'}];
const ENVS: {id: Environment; label: string}[] = [{id: 'studio', label: 'Studio'}, {id: 'meadow', label: 'Meadow'}, {id: 'dusk', label: 'Dusk'}];
const SHADOWS: {id: ShadowQuality; label: string}[] = [{id: 'off', label: 'Off'}, {id: 'low', label: 'Low'}, {id: 'high', label: 'High'}];
const ANIM_LABEL: Record<AnimState, string> = {idle: 'Idle', walk: 'Walk', run: 'Run', jump: 'Jump', attack: 'Attack', hit: 'Hit', celebrate: 'Celebrate', trot: 'Trot', flap: 'Flap', puff: 'Puff', squash: 'Squash', stomp: 'Stomp', dance: 'Dance', flex: 'Flex', wave: 'Wave', poke: 'Poke'};

function Seg<T extends string>({items, value, onChange, label}: {items: {id: T; label: string}[]; value: T; onChange: (v: T) => void; label: string}) {
  return (
    <div className={styles.row} role="group" aria-label={label}>
      {items.map((it) => <button key={it.id} type="button" className={styles.btn} aria-pressed={value === it.id} onClick={() => onChange(it.id)}>{it.label}</button>)}
    </div>
  );
}
function Swatches({colors, value, onChange, label}: {colors: readonly number[]; value: number | undefined; onChange: (c: number) => void; label: string}) {
  return (
    <div className={styles.row} role="group" aria-label={label}>
      {colors.map((c) => <button key={c} type="button" className={styles.swatch} style={{background: hex(c)}} aria-label={`${label} ${hex(c)}`} aria-pressed={value === c} onClick={() => onChange(c)} />)}
    </div>
  );
}

export function Controls({def, rig}: {def: AssetDef; rig: Rig | null}) {
  const st = useKingdom();
  const [report, setReport] = useState<ExportReport | {error: string} | 'busy' | null>(null);
  const creature = rig?.group.userData.creature as {kind: string; variant: Variant; difficulty: Difficulty} | undefined;
  const states = rig?.states ?? [];
  const onExport = async () => {
    if (!rig) return; setReport('busy');
    try { setReport(await exportGLB(rig, def.id)); } catch (e) { setReport({error: e instanceof Error ? e.message : 'Export failed'}); }
  };
  return (
    <aside className={styles.panel} aria-label="Asset controls">
      <section className={styles.section}>
        <h2 className={styles.assetName}>{def.name}</h2>
        <p className={styles.assetSub}>{def.subtitle}{def.role ? <span className={styles.chip}>{def.role}</span> : null}</p>
        <p className={styles.assetDesc}>{def.description}</p>
        {creature ? (
          <dl className={styles.stats} aria-label="Difficulty">
            <div><dt>HP</dt><dd>{creature.difficulty.hp}</dd></div><div><dt>Damage</dt><dd>{creature.difficulty.damage}</dd></div><div><dt>Speed</dt><dd>{creature.difficulty.speed}</dd></div><div><dt>Reward</dt><dd>{creature.difficulty.reward}</dd></div>
          </dl>
        ) : null}
      </section>
      {def.customizable.includes('variant') ? (
        <section className={styles.section}><h3>Variant</h3><Seg items={VARIANTS} value={st.variant} onChange={st.setVariant} label="Variant" /><p className={styles.hint}>Boss variants change anatomy, not just scale.</p></section>
      ) : null}
      {def.customizable.includes('mount') ? (
        <section className={styles.section}><h3>Rider</h3><div className={styles.row}><button type="button" className={styles.btn} aria-pressed={st.rider} onClick={() => st.setRider(!st.rider)}>{st.rider ? 'Rider seated' : 'Seat a rider'}</button></div><p className={styles.hint}>The rider uses the hero look below.</p></section>
      ) : null}
      {def.customizable.includes('hero') ? (
        <section className={styles.section}>
          <h3>Look</h3>
          <Seg items={GENDERS} value={st.hero.gender ?? (def.id.includes('queen') || def.id.includes('silver') || def.id.includes('champion') || def.id.includes('page') ? 'fem' : def.id.includes('sovereign') ? 'neutral' : 'masc')} onChange={(gender) => st.setHero({gender})} label="Body" />
          <h4>Skin</h4><Swatches colors={C.skin} value={st.hero.skin} onChange={(skin) => st.setHero({skin})} label="Skin tone" />
          <h4>Hair</h4>
          <Seg items={HAIR.map((h) => ({id: h, label: h[0].toUpperCase() + h.slice(1)}))} value={st.hero.hair ?? 'short'} onChange={(hair) => st.setHero({hair})} label="Hair style" />
          <Swatches colors={HAIR_COLORS} value={st.hero.hairColor} onChange={(hairColor) => st.setHero({hairColor})} label="Hair colour" />
          <h4>Extras</h4>
          <Seg items={ACCESSORIES.map((a) => ({id: a, label: a[0].toUpperCase() + a.slice(1)}))} value={st.hero.accessory ?? 'none'} onChange={(accessory) => st.setHero({accessory})} label="Accessory" />
          <div className={styles.row}>
            <button type="button" className={styles.btn} aria-pressed={!!st.hero.beard} onClick={() => st.setHero({beard: !st.hero.beard})}>Beard</button>
            <button type="button" className={styles.btn} onClick={st.shuffleSeed}>Shuffle details</button>
            <button type="button" className={styles.btn} onClick={st.resetHero}>Reset look</button>
          </div>
        </section>
      ) : null}
      {states.length ? (
        <section className={styles.section}><h3>Animation</h3>
          <div className={styles.row} role="group" aria-label="Animation state">{states.map((s) => <button key={s} type="button" className={styles.btn} aria-pressed={st.anim === s} onClick={() => st.setAnim(s)}>{ANIM_LABEL[s]}</button>)}</div>
          {st.reducedMotion ? <p className={styles.hint}>Reduced motion is on: animations play at a third of their range and auto-rotate is off.</p> : null}
        </section>
      ) : null}
      <section className={styles.section}>
        <h3>View</h3>
        <Seg items={PRESETS} value={st.cameraPreset} onChange={st.setCameraPreset} label="Camera preset" />
        <div className={styles.row}>
          <button type="button" className={styles.btn} onClick={st.resetCamera}>Reset camera</button>
          <button type="button" className={styles.btn} aria-pressed={st.autoRotate} onClick={() => st.setAutoRotate(!st.autoRotate)} disabled={st.reducedMotion}>Auto-rotate</button>
          <button type="button" className={styles.btn} aria-pressed={st.scaleRef} onClick={() => st.setScaleRef(!st.scaleRef)}>2 m post</button>
        </div>
        <h4>Environment</h4><Seg items={ENVS} value={st.environment} onChange={st.setEnvironment} label="Environment" />
        <h4>Shadows</h4><Seg items={SHADOWS} value={st.shadows} onChange={st.setShadows} label="Shadow quality" />
      </section>
      <section className={styles.section}>
        <h3>Export</h3>
        <div className={styles.row}><button type="button" className={styles.btn} onClick={onExport} disabled={!rig || report === 'busy'}>{report === 'busy' ? 'Exporting…' : 'Download GLB'}</button></div>
        <p className={styles.hint} aria-live="polite">
          {report === null ? 'Static GLB of the current pose with vertex colours and pixel textures. Procedural animations are not exported.' : report === 'busy' ? 'Writing and re-importing…' : 'error' in report ? `Export failed: ${report.error}` : `${report.ok ? 'Verified' : 'Check'}: ${(report.bytes / 1024).toFixed(0)} KB, ${report.verifiedMeshes}/${report.meshes} meshes re-imported. ${report.note}`}
        </p>
      </section>
    </aside>
  );
}
