import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useMagic } from '../../app/store';
import { globalUniforms } from '../shared/uniforms';

function labelTexture(draw: (c: CanvasRenderingContext2D, w: number, h: number) => void, w = 256, h = 256) {
  const cv = document.createElement('canvas');
  cv.width = w;
  cv.height = h;
  draw(cv.getContext('2d')!, w, h);
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

const serif = '"Cormorant Garamond", Georgia, serif';

/** The four magical objects that mirror the four party-detail cards. */
export function DetailArtifacts({ position }: { position: [number, number, number] }) {
  const refs = useRef<(THREE.Group | null)[]>([]);
  const tex = useMemo(
    () => ({
      calendar: labelTexture((c, w, h) => {
        c.fillStyle = '#fbf5ea';
        c.fillRect(0, 0, w, h);
        c.fillStyle = '#d8a1ae';
        c.fillRect(0, 0, w, 64);
        c.fillStyle = '#fff';
        c.font = `600 38px ${serif}`;
        c.textAlign = 'center';
        c.fillText('November', w / 2, 46);
        c.fillStyle = '#4a3366';
        c.font = `700 120px ${serif}`;
        c.fillText('28', w / 2, 180);
        c.font = `500 30px ${serif}`;
        c.fillText('Saturday', w / 2, 228);
      }),
      clock: labelTexture((c, w, h) => {
        c.fillStyle = '#fbf5ea';
        c.beginPath();
        c.arc(w / 2, h / 2, w / 2 - 4, 0, Math.PI * 2);
        c.fill();
        c.strokeStyle = '#b8924a';
        c.lineWidth = 6;
        c.stroke();
        c.fillStyle = '#4a3366';
        c.font = `600 30px ${serif}`;
        c.textAlign = 'center';
        c.textBaseline = 'middle';
        ['XII', 'III', 'VI', 'IX'].forEach((r, i) => {
          const a = (i / 4) * Math.PI * 2 - Math.PI / 2;
          c.fillText(r, w / 2 + Math.cos(a) * 92, h / 2 + Math.sin(a) * 92);
        });
        c.strokeStyle = '#4a3366';
        c.lineCap = 'round';
        c.lineWidth = 8;
        c.beginPath();
        c.moveTo(w / 2, h / 2);
        c.lineTo(w / 2, h / 2 + 62); // hour hand on 6
        c.stroke();
        c.lineWidth = 5;
        c.beginPath();
        c.moveTo(w / 2, h / 2);
        c.lineTo(w / 2, h / 2 - 86); // minute hand on 12
        c.stroke();
      }),
      map: labelTexture((c, w, h) => {
        c.fillStyle = '#f2e3c4';
        c.fillRect(0, 0, w, h);
        c.strokeStyle = 'rgba(120,90,60,0.5)';
        c.setLineDash([8, 8]);
        c.lineWidth = 4;
        c.beginPath();
        c.moveTo(30, 220);
        c.bezierCurveTo(90, 160, 60, 110, 150, 120);
        c.bezierCurveTo(200, 124, 190, 70, 200, 60);
        c.stroke();
        c.setLineDash([]);
        c.fillStyle = '#c45b74';
        c.beginPath();
        c.arc(200, 56, 12, 0, Math.PI * 2);
        c.fill();
        c.fillStyle = '#6a4a3a';
        c.font = `italic 600 24px ${serif}`;
        c.fillText('Eden Oak Trail', 40, 40);
      }, 256, 256),
    }),
    [],
  );
  const glowMats = useMemo(() => [0, 1, 2, 3].map(() => new THREE.MeshStandardMaterial({ color: '#fff6e0', emissive: '#ffd9a0', emissiveIntensity: 0.2, transparent: true, opacity: 0.35, depthWrite: false })), []);
  const fabric = useMemo(
    () =>
      new THREE.ShaderMaterial({
        side: THREE.DoubleSide,
        uniforms: { uTime: globalUniforms.uTime },
        vertexShader: `uniform float uTime; varying vec2 vUv; varying float vS; void main(){ vUv=uv; vec3 p=position;
          float w = sin(uv.x*6.0 + uTime*1.8)*0.25 + sin(uv.y*5.0 + uTime*1.3)*0.15; p.z += w; vS = 0.8+0.2*cos(uv.x*6.0+uTime*1.8);
          gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.0);}`,
        fragmentShader: `varying vec2 vUv; varying float vS; void main(){
          vec3 a=vec3(0.79,0.71,0.92), b=vec3(0.95,0.72,0.78), c=vec3(0.66,0.78,0.92), d=vec3(0.75,0.9,0.8);
          vec3 col = mix(mix(a,b,vUv.x), mix(c,d,vUv.x), vUv.y);
          gl_FragColor=vec4(col*vS,1.0);
          #include <colorspace_fragment>
        }`,
      }),
    [],
  );
  const keys = ['date', 'time', 'dress', 'location'];
  useFrame((st) => {
    const t = st.clock.elapsedTime;
    const hovered = useMagic.getState().hoveredDetail;
    refs.current.forEach((g, i) => {
      if (!g) return;
      const on = hovered === keys[i];
      g.position.y = Math.sin(t * 0.9 + i * 1.7) * 0.35 + (on ? 0.6 : 0);
      g.rotation.y = Math.sin(t * 0.5 + i) * 0.4 + (on ? t * 1.5 : 0);
      const s = g.scale.x + ((on ? 1.25 : 1) - g.scale.x) * 0.1;
      g.scale.setScalar(s);
      glowMats[i].emissiveIntensity += ((on ? 2.2 : 0.25) - glowMats[i].emissiveIntensity) * 0.1;
    });
  });
  const spots: [number, number, number][] = [[-6, 2.4, 0], [-2, 3.2, -2], [2, 3.2, -2], [6, 2.4, 0]];
  return (
    <group position={position} rotation={[0, 0.75, 0]}>
      {/* enchanted calendar */}
      <group ref={(el) => void (refs.current[0] = el)} position={spots[0]}>
        <group position={[0, 0, 0]}>
          <mesh rotation={[-0.1, 0, 0]}>
            <boxGeometry args={[1.8, 2.0, 0.12]} />
            <meshStandardMaterial color="#e2c07a" metalness={0.8} roughness={0.3} />
          </mesh>
          <mesh position={[0, 0, 0.065]} rotation={[-0.1, 0, 0]}>
            <planeGeometry args={[1.6, 1.8]} />
            <meshStandardMaterial map={tex.calendar} roughness={0.8} emissive="#ffffff" emissiveMap={tex.calendar} emissiveIntensity={0.25} />
          </mesh>
        </group>
        <mesh material={glowMats[0]}>
          <sphereGeometry args={[1.6, 20, 14]} />
        </mesh>
      </group>
      {/* glowing magical clock */}
      <group ref={(el) => void (refs.current[1] = el)} position={spots[1]}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[1, 1, 0.22, 48]} />
          <meshStandardMaterial color="#e2c07a" metalness={1} roughness={0.22} />
        </mesh>
        <mesh position={[0, 0, 0.115]}>
          <circleGeometry args={[0.88, 48]} />
          <meshStandardMaterial map={tex.clock} emissive="#ffffff" emissiveMap={tex.clock} emissiveIntensity={0.35} />
        </mesh>
        <mesh position={[0, 1.15, 0]} rotation={[0, 0, 0]}>
          <torusGeometry args={[0.18, 0.05, 8, 20]} />
          <meshStandardMaterial color="#e2c07a" metalness={1} roughness={0.22} />
        </mesh>
        <mesh material={glowMats[1]}>
          <sphereGeometry args={[1.6, 20, 14]} />
        </mesh>
      </group>
      {/* floating pastel fabric */}
      <group ref={(el) => void (refs.current[2] = el)} position={spots[2]}>
        <mesh material={fabric}>
          <planeGeometry args={[2.2, 1.6, 24, 16]} />
        </mesh>
        <mesh material={glowMats[2]}>
          <sphereGeometry args={[1.6, 20, 14]} />
        </mesh>
      </group>
      {/* castle map scroll */}
      <group ref={(el) => void (refs.current[3] = el)} position={spots[3]}>
        <mesh>
          <cylinderGeometry args={[1, 1, 1.8, 32, 1, true, -0.8, 1.6]} />
          <meshStandardMaterial map={tex.map} side={THREE.DoubleSide} roughness={0.9} emissive="#ffffff" emissiveMap={tex.map} emissiveIntensity={0.2} />
        </mesh>
        {[-0.95, 0.95].map((y) => (
          <mesh key={y} position={[Math.sin(0.8) * 1, y, Math.cos(0.8) * 1]}>
            <cylinderGeometry args={[0.08, 0.08, 0.3, 10]} />
            <meshStandardMaterial color="#9c7486" />
          </mesh>
        ))}
        <mesh material={glowMats[3]}>
          <sphereGeometry args={[1.6, 20, 14]} />
        </mesh>
      </group>
    </group>
  );
}
