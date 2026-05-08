import { useEffect, useRef } from "react";
import * as THREE from "three";

import { cn } from "../../lib/utils";

export function DottedSurface({ className, dotColor = "#d1d5db", ...props }) {
  const containerRef = useRef(null);
  const sceneRef = useRef(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const SEPARATION = 130;
    const AMOUNT_X = 34;
    const AMOUNT_Y = 52;

    const scene = new THREE.Scene();
    const width = Math.max(container.clientWidth, 1);
    const height = Math.max(container.clientHeight, 1);
    const camera = new THREE.PerspectiveCamera(60, width / height, 1, 10000);
    camera.position.set(0, 350, 1180);

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio || 1);
    renderer.setSize(width, height);
    renderer.setClearColor(0x000000, 0);
    container.appendChild(renderer.domElement);

    const geometry = new THREE.BufferGeometry();
    const positions = [];

    for (let ix = 0; ix < AMOUNT_X; ix += 1) {
      for (let iy = 0; iy < AMOUNT_Y; iy += 1) {
        positions.push(
          ix * SEPARATION - (AMOUNT_X * SEPARATION) / 2,
          0,
          iy * SEPARATION - (AMOUNT_Y * SEPARATION) / 2
        );
      }
    }

    geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));

    const material = new THREE.PointsMaterial({
      color: new THREE.Color(dotColor),
      size: 9,
      transparent: true,
      opacity: 0.85,
      sizeAttenuation: true,
    });

    const points = new THREE.Points(geometry, material);
    scene.add(points);

    let count = 0;
    let animationFrame = 0;

    const animate = () => {
      animationFrame = requestAnimationFrame(animate);
      const attribute = geometry.attributes.position;
      const array = attribute.array;

      let i = 0;
      for (let ix = 0; ix < AMOUNT_X; ix += 1) {
        for (let iy = 0; iy < AMOUNT_Y; iy += 1) {
          const idx = i * 3;
          array[idx + 1] = Math.sin((ix + count) * 0.3) * 44 + Math.sin((iy + count) * 0.5) * 44;
          i += 1;
        }
      }

      attribute.needsUpdate = true;
      renderer.render(scene, camera);
      count += 0.08;
    };

    const handleResize = () => {
      if (!containerRef.current) return;
      const w = Math.max(containerRef.current.clientWidth, 1);
      const h = Math.max(containerRef.current.clientHeight, 1);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);

    window.addEventListener("resize", handleResize);
    handleResize();
    animate();

    sceneRef.current = { scene, renderer, points, geometry, material, animationFrame };

    return () => {
      window.removeEventListener("resize", handleResize);
      resizeObserver.disconnect();
      if (!sceneRef.current) return;
      cancelAnimationFrame(sceneRef.current.animationFrame);
      sceneRef.current.geometry.dispose();
      sceneRef.current.material.dispose();
      sceneRef.current.renderer.dispose();
      if (container.contains(sceneRef.current.renderer.domElement)) {
        container.removeChild(sceneRef.current.renderer.domElement);
      }
      sceneRef.current = null;
    };
  }, [dotColor]);

  return <div ref={containerRef} className={cn("pointer-events-none absolute inset-0 z-0", className)} {...props} />;
}
