import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass";

gsap.registerPlugin(ScrollTrigger);

export function HorizonHeroSection({
  title = "HORIZON",
  subtitleLine1 = "Where vision meets reality,",
  subtitleLine2 = "we shape the future of tomorrow",
  ctaLabel,
  onCtaClick,
  showMeta = true,
}) {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const titleRef = useRef(null);
  const subtitleRef = useRef(null);
  const scrollProgressRef = useRef(null);
  const menuRef = useRef(null);

  const smoothCameraPos = useRef({ x: 0, y: 30, z: 100 });
  const [scrollProgress, setScrollProgress] = useState(0);
  const [currentSection, setCurrentSection] = useState(1);
  const [isReady, setIsReady] = useState(false);
  const totalSections = 2;

  const threeRefs = useRef({
    scene: null,
    camera: null,
    renderer: null,
    composer: null,
    stars: [],
    nebula: null,
    mountains: [],
    animationId: null,
    locations: [],
    targetCameraX: 0,
    targetCameraY: 30,
    targetCameraZ: 100,
  });

  useEffect(() => {
    const refs = threeRefs.current;

    const createStarField = () => {
      const starCount = 3000;

      for (let i = 0; i < 3; i += 1) {
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(starCount * 3);
        const colors = new Float32Array(starCount * 3);
        const sizes = new Float32Array(starCount);

        for (let j = 0; j < starCount; j += 1) {
          const radius = 200 + Math.random() * 800;
          const theta = Math.random() * Math.PI * 2;
          const phi = Math.acos(Math.random() * 2 - 1);

          positions[j * 3] = radius * Math.sin(phi) * Math.cos(theta);
          positions[j * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
          positions[j * 3 + 2] = radius * Math.cos(phi);

          const color = new THREE.Color();
          const colorChoice = Math.random();
          if (colorChoice < 0.7) color.setHSL(0, 0, 0.8 + Math.random() * 0.2);
          else if (colorChoice < 0.9) color.setHSL(0.08, 0.5, 0.8);
          else color.setHSL(0.6, 0.5, 0.8);

          colors[j * 3] = color.r;
          colors[j * 3 + 1] = color.g;
          colors[j * 3 + 2] = color.b;

          sizes[j] = Math.random() * 2 + 0.5;
        }

        geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
        geometry.setAttribute("size", new THREE.BufferAttribute(sizes, 1));

        const material = new THREE.ShaderMaterial({
          uniforms: {
            time: { value: 0 },
            depth: { value: i },
          },
          vertexShader: `
            attribute float size;
            attribute vec3 color;
            varying vec3 vColor;
            uniform float time;
            uniform float depth;
            void main() {
              vColor = color;
              vec3 pos = position;
              float angle = time * 0.05 * (1.0 - depth * 0.3);
              mat2 rot = mat2(cos(angle), -sin(angle), sin(angle), cos(angle));
              pos.xy = rot * pos.xy;
              vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
              gl_PointSize = size * (300.0 / -mvPosition.z);
              gl_Position = projectionMatrix * mvPosition;
            }
          `,
          fragmentShader: `
            varying vec3 vColor;
            void main() {
              float dist = length(gl_PointCoord - vec2(0.5));
              if (dist > 0.5) discard;
              float opacity = 1.0 - smoothstep(0.0, 0.5, dist);
              gl_FragColor = vec4(vColor, opacity);
            }
          `,
          transparent: true,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        });

        const stars = new THREE.Points(geometry, material);
        refs.scene.add(stars);
        refs.stars.push(stars);
      }
    };

    const createNebula = () => {
      const geometry = new THREE.PlaneGeometry(8000, 4000, 100, 100);
      const material = new THREE.ShaderMaterial({
        uniforms: {
          time: { value: 0 },
          color1: { value: new THREE.Color(0x0033ff) },
          color2: { value: new THREE.Color(0xff0066) },
          opacity: { value: 0.3 },
        },
        vertexShader: `
          varying vec2 vUv;
          varying float vElevation;
          uniform float time;
          void main() {
            vUv = uv;
            vec3 pos = position;
            float elevation = sin(pos.x * 0.01 + time) * cos(pos.y * 0.01 + time) * 20.0;
            pos.z += elevation;
            vElevation = elevation;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
          }
        `,
        fragmentShader: `
          uniform vec3 color1;
          uniform vec3 color2;
          uniform float opacity;
          uniform float time;
          varying vec2 vUv;
          varying float vElevation;
          void main() {
            float mixFactor = sin(vUv.x * 10.0 + time) * cos(vUv.y * 10.0 + time);
            vec3 color = mix(color1, color2, mixFactor * 0.5 + 0.5);
            float alpha = opacity * (1.0 - length(vUv - 0.5) * 2.0);
            alpha *= 1.0 + vElevation * 0.01;
            gl_FragColor = vec4(color, alpha);
          }
        `,
        transparent: true,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
        depthWrite: false,
      });

      const nebula = new THREE.Mesh(geometry, material);
      nebula.position.z = -1050;
      refs.scene.add(nebula);
      refs.nebula = nebula;
    };

    const createMountains = () => {
      const layers = [
        { distance: -50, height: 60, color: 0x1a1a2e, opacity: 1 },
        { distance: -100, height: 80, color: 0x16213e, opacity: 0.8 },
        { distance: -150, height: 100, color: 0x0f3460, opacity: 0.6 },
        { distance: -200, height: 120, color: 0x0a4668, opacity: 0.4 },
      ];

      layers.forEach((layer, index) => {
        const points = [];
        const segments = 50;

        for (let i = 0; i <= segments; i += 1) {
          const x = (i / segments - 0.5) * 1000;
          const y = Math.sin(i * 0.1) * layer.height + Math.sin(i * 0.05) * layer.height * 0.5 + Math.random() * layer.height * 0.2 - 100;
          points.push(new THREE.Vector2(x, y));
        }

        points.push(new THREE.Vector2(5000, -300));
        points.push(new THREE.Vector2(-5000, -300));

        const shape = new THREE.Shape(points);
        const geometry = new THREE.ShapeGeometry(shape);
        const material = new THREE.MeshBasicMaterial({
          color: layer.color,
          transparent: true,
          opacity: layer.opacity,
          side: THREE.DoubleSide,
        });

        const mountain = new THREE.Mesh(geometry, material);
        mountain.position.z = layer.distance;
        mountain.position.y = 50;
        mountain.userData = { baseZ: layer.distance, index };
        refs.scene.add(mountain);
        refs.mountains.push(mountain);
      });

      refs.locations = refs.mountains.map((m) => m.position.z);
    };

    const createAtmosphere = () => {
      const geometry = new THREE.SphereGeometry(600, 32, 32);
      const material = new THREE.ShaderMaterial({
        uniforms: { time: { value: 0 } },
        vertexShader: `
          varying vec3 vNormal;
          void main() {
            vNormal = normalize(normalMatrix * normal);
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          varying vec3 vNormal;
          uniform float time;
          void main() {
            float intensity = pow(0.7 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.0);
            vec3 atmosphere = vec3(0.3, 0.6, 1.0) * intensity;
            float pulse = sin(time * 2.0) * 0.1 + 0.9;
            atmosphere *= pulse;
            gl_FragColor = vec4(atmosphere, intensity * 0.25);
          }
        `,
        side: THREE.BackSide,
        blending: THREE.AdditiveBlending,
        transparent: true,
      });

      refs.scene.add(new THREE.Mesh(geometry, material));
    };

    const animate = () => {
      refs.animationId = requestAnimationFrame(animate);
      const time = Date.now() * 0.001;

      refs.stars.forEach((starField) => {
        if (starField.material.uniforms) starField.material.uniforms.time.value = time;
      });

      if (refs.nebula?.material?.uniforms) refs.nebula.material.uniforms.time.value = time * 0.5;

      if (refs.camera) {
        const smoothingFactor = 0.05;
        smoothCameraPos.current.x += (refs.targetCameraX - smoothCameraPos.current.x) * smoothingFactor;
        smoothCameraPos.current.y += (refs.targetCameraY - smoothCameraPos.current.y) * smoothingFactor;
        smoothCameraPos.current.z += (refs.targetCameraZ - smoothCameraPos.current.z) * smoothingFactor;

        refs.camera.position.x = smoothCameraPos.current.x + Math.sin(time * 0.1) * 2;
        refs.camera.position.y = smoothCameraPos.current.y + Math.cos(time * 0.15) * 1;
        refs.camera.position.z = smoothCameraPos.current.z;
        refs.camera.lookAt(0, 10, -600);
      }

      refs.mountains.forEach((mountain, i) => {
        const parallaxFactor = 1 + i * 0.5;
        mountain.position.x = Math.sin(time * 0.1) * 2 * parallaxFactor;
        mountain.position.y = 50 + Math.cos(time * 0.15) * parallaxFactor;
      });

      refs.composer?.render();
    };

    refs.scene = new THREE.Scene();
    refs.scene.fog = new THREE.FogExp2(0x000000, 0.00025);

    refs.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 2000);
    refs.camera.position.z = 100;
    refs.camera.position.y = 20;

    refs.renderer = new THREE.WebGLRenderer({
      canvas: canvasRef.current,
      antialias: true,
      alpha: true,
    });
    refs.renderer.setSize(window.innerWidth, window.innerHeight);
    refs.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    refs.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    refs.renderer.toneMappingExposure = 0.5;

    refs.composer = new EffectComposer(refs.renderer);
    refs.composer.addPass(new RenderPass(refs.scene, refs.camera));
    refs.composer.addPass(new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.8, 0.4, 0.85));

    createStarField();
    createNebula();
    createMountains();
    createAtmosphere();
    animate();
    setIsReady(true);

    const handleResize = () => {
      if (!refs.camera || !refs.renderer || !refs.composer) return;
      refs.camera.aspect = window.innerWidth / window.innerHeight;
      refs.camera.updateProjectionMatrix();
      refs.renderer.setSize(window.innerWidth, window.innerHeight);
      refs.composer.setSize(window.innerWidth, window.innerHeight);
    };

    window.addEventListener("resize", handleResize);

    return () => {
      if (refs.animationId) cancelAnimationFrame(refs.animationId);
      window.removeEventListener("resize", handleResize);
      refs.stars.forEach((s) => {
        s.geometry.dispose();
        s.material.dispose();
      });
      refs.mountains.forEach((m) => {
        m.geometry.dispose();
        m.material.dispose();
      });
      if (refs.nebula) {
        refs.nebula.geometry.dispose();
        refs.nebula.material.dispose();
      }
      refs.renderer?.dispose();
      ScrollTrigger.getAll().forEach((t) => t.kill());
    };
  }, []);

  useEffect(() => {
    if (!isReady) return;

    const readyTargets = [menuRef.current, titleRef.current, subtitleRef.current, scrollProgressRef.current].filter(Boolean);
    if (readyTargets.length > 0) {
      gsap.set(readyTargets, {
        visibility: "visible",
      });
    }

    const tl = gsap.timeline();
    if (menuRef.current) tl.from(menuRef.current, { x: -100, opacity: 0, duration: 1, ease: "power3.out" });

    if (titleRef.current) {
      const titleChars = titleRef.current.querySelectorAll(".title-char");
      tl.from(titleChars, { y: 120, opacity: 0, duration: 1.3, stagger: 0.04, ease: "power4.out" }, "-=0.5");
    }

    if (subtitleRef.current) {
      const lines = subtitleRef.current.querySelectorAll(".subtitle-line");
      tl.from(lines, { y: 30, opacity: 0, duration: 1, stagger: 0.15, ease: "power3.out" }, "-=0.8");
    }

    if (scrollProgressRef.current) tl.from(scrollProgressRef.current, { opacity: 0, y: 30, duration: 1 }, "-=0.5");

    return () => tl.kill();
  }, [isReady]);

  useEffect(() => {
    const handleScroll = () => {
      const refs = threeRefs.current;
      const scrollY = window.scrollY;
      const windowHeight = window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight;
      const maxScroll = Math.max(documentHeight - windowHeight, 1);
      const progress = Math.min(scrollY / maxScroll, 1);

      setScrollProgress(progress);
      const section = Math.min(Math.floor(progress * totalSections), totalSections);
      setCurrentSection(section);

      const totalProgress = progress * totalSections;
      const sectionProgress = totalProgress % 1;

      const cameraPositions = [
        { x: 0, y: 30, z: 300 },
        { x: 0, y: 40, z: -50 },
        { x: 0, y: 50, z: -700 },
      ];

      const currentPos = cameraPositions[section] || cameraPositions[0];
      const nextPos = cameraPositions[section + 1] || currentPos;

      refs.targetCameraX = currentPos.x + (nextPos.x - currentPos.x) * sectionProgress;
      refs.targetCameraY = currentPos.y + (nextPos.y - currentPos.y) * sectionProgress;
      refs.targetCameraZ = currentPos.z + (nextPos.z - currentPos.z) * sectionProgress;

      refs.mountains.forEach((mountain, i) => {
        if (progress > 0.7) mountain.position.z = 600000;
        else mountain.position.z = refs.locations[i] ?? mountain.userData.baseZ;
      });

      if (refs.nebula && refs.mountains[3]) refs.nebula.position.z = refs.mountains[3].position.z;
    };

    window.addEventListener("scroll", handleScroll);
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, [totalSections]);

  const splitTitle = (text) => text.split("").map((char, i) => <span key={`${char}-${i}`} className="title-char">{char}</span>);

  return (
    <div ref={containerRef} className="hero-container cosmos-style">
      <canvas ref={canvasRef} className="hero-canvas" />

      {showMeta ? (
        <div ref={menuRef} className="side-menu" style={{ visibility: "hidden" }}>
          <div className="menu-icon"><span /><span /><span /></div>
          <div className="vertical-text">SPACE</div>
        </div>
      ) : null}

      <div className="hero-content cosmos-content">
        <h1 ref={titleRef} className="hero-title">{splitTitle(title)}</h1>
        <div ref={subtitleRef} className="hero-subtitle cosmos-subtitle">
          <p className="subtitle-line">{subtitleLine1}</p>
          <p className="subtitle-line">{subtitleLine2}</p>
        </div>
        {ctaLabel ? (
          <div className="hero-cta-wrap">
            <button type="button" onClick={onCtaClick} className="hero-cta-btn">
              {ctaLabel}
            </button>
          </div>
        ) : null}
      </div>

      {showMeta ? (
        <div ref={scrollProgressRef} className="scroll-progress" style={{ visibility: "hidden" }}>
          <div className="scroll-text">SCROLL</div>
          <div className="progress-track"><div className="progress-fill" style={{ width: `${scrollProgress * 100}%` }} /></div>
          <div className="section-counter">{String(currentSection).padStart(2, "0")} / {String(totalSections).padStart(2, "0")}</div>
        </div>
      ) : null}

      <div className="scroll-sections">
        {[...Array(2)].map((_, i) => (
          <section key={i} className="content-section" />
        ))}
      </div>

      <style>{`
        .hero-container { position: relative; min-height: 300vh; color: #e5e7eb; overflow: hidden; }
        .hero-canvas { position: fixed; inset: 0; width: 100%; height: 100%; z-index: 0; }
        .side-menu { position: fixed; left: 24px; top: 28px; z-index: 10; display: flex; align-items: center; gap: 12px; }
        .menu-icon { display: grid; gap: 4px; }
        .menu-icon span { display:block; width: 20px; height: 2px; background:#fff; opacity:.7; }
        .vertical-text { writing-mode: vertical-rl; font-size: 10px; letter-spacing: 0.2em; opacity: .65; }
        .hero-content { position: fixed; inset: 0; z-index: 9; display: grid; place-content: center; text-align: center; pointer-events: auto; }
        .hero-title { font-size: clamp(3rem, 11vw, 9rem); font-weight: 800; letter-spacing: .12em; color: rgba(255,255,255,.9); display: flex; justify-content: center; gap: .02em; }
        .hero-subtitle { margin-top: 1rem; font-size: clamp(1rem, 2vw, 1.2rem); opacity: .78; line-height: 1.5; }
        .subtitle-line { margin: 0; }
        .hero-cta-wrap { margin-top: 1.4rem; pointer-events: auto; display: flex; justify-content: center; }
        .hero-cta-btn {
          border: 1px solid rgba(255,255,255,.25);
          background: linear-gradient(90deg,#4f46e5,#db2777);
          color: #fff;
          font-weight: 700;
          letter-spacing: .04em;
          text-transform: uppercase;
          border-radius: 12px;
          padding: 12px 22px;
          box-shadow: 0 10px 30px rgba(79,70,229,.35);
          transition: transform .2s ease, box-shadow .2s ease, opacity .2s ease;
        }
        .hero-cta-btn:hover { transform: translateY(-1px); opacity: .95; box-shadow: 0 16px 40px rgba(79,70,229,.45); }
        .scroll-progress { position: fixed; left: 24px; bottom: 24px; z-index: 10; width: min(280px, 70vw); }
        .scroll-text { font-size: 11px; opacity:.6; letter-spacing: .18em; margin-bottom: 8px; }
        .progress-track { height: 3px; background: rgba(255,255,255,.22); border-radius: 999px; overflow: hidden; }
        .progress-fill { height: 100%; background: linear-gradient(90deg,#4f46e5,#ec4899); transition: width .15s linear; }
        .section-counter { margin-top: 8px; font-size: 11px; opacity:.55; }
        .scroll-sections { position: relative; z-index: 1; }
        .content-section { min-height: 100vh; }
      `}</style>
    </div>
  );
}
