"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";

export default function ImpactSphere() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // 1. Scene setup
    const width = containerRef.current.clientWidth || 500;
    const height = containerRef.current.clientHeight || 500;
    const scene = new THREE.Scene();

    // Camera
    const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 100);
    camera.position.z = 25;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    containerRef.current.appendChild(renderer.domElement);

    // 2. Create Glowing Particles
    const count = 200; // Optimal count for performance and visibility
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const sizes = new Float32Array(count);

    // Government palette - high visibility on light background
    const colorPalette = [
      new THREE.Color("#14274e"), // Navy Blue
      new THREE.Color("#f7941d"), // Saffron Accent
      new THREE.Color("#10b981"), // Emerald Green
      new THREE.Color("#2563eb"), // Royal Blue
    ];

    for (let i = 0; i < count; i++) {
      // Sphere coordinates mapping
      const u = Math.random();
      const v = Math.random();
      const theta = u * 2.0 * Math.PI;
      const phi = Math.acos(2.0 * v - 1.0);
      const r = 8 + Math.random() * 3.0; // Radius

      const x = r * Math.sin(phi) * Math.cos(theta);
      const y = r * Math.sin(phi) * Math.sin(theta);
      const z = r * Math.cos(phi);

      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;

      // Assign random color from palette
      const color = colorPalette[Math.floor(Math.random() * colorPalette.length)];
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;

      // Random sizes
      sizes[i] = 2.0 + Math.random() * 3.5;
    }

    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));

    // Particle texture (Circle particle shader representation)
    const canvas = document.createElement("canvas");
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      const grad = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
      grad.addColorStop(0, "rgba(255,255,255,1)");
      grad.addColorStop(0.3, "rgba(240,240,255,0.9)");
      grad.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(16, 16, 16, 0, Math.PI * 2);
      ctx.fill();
    }
    const texture = new THREE.CanvasTexture(canvas);

    const material = new THREE.PointsMaterial({
      size: 1.2,
      map: texture,
      vertexColors: true,
      transparent: true,
      blending: THREE.NormalBlending, // Normal blending to prevent washing out on white bg
      depthWrite: false,
    });

    const particleSystem = new THREE.Points(geometry, material);
    scene.add(particleSystem);

    // 3. Create Connection Network Lines
    const linePositions: number[] = [];
    const lineColors: number[] = [];
    
    // Find adjacent nodes and generate lines
    for (let i = 0; i < count; i++) {
      for (let j = i + 1; j < count; j++) {
        const dx = positions[i * 3] - positions[j * 3];
        const dy = positions[i * 3 + 1] - positions[j * 3 + 1];
        const dz = positions[i * 3 + 2] - positions[j * 3 + 2];
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
        
        // Connect if close to simulate collaborative nodes network
        if (dist < 4.2) {
          linePositions.push(positions[i * 3], positions[i * 3 + 1], positions[i * 3 + 2]);
          linePositions.push(positions[j * 3], positions[j * 3 + 1], positions[j * 3 + 2]);
          
          lineColors.push(0.11, 0.22, 0.54); // Subtle Navy R, G, B
          lineColors.push(0.11, 0.22, 0.54);
        }
      }
    }
    
    const lineGeometry = new THREE.BufferGeometry();
    lineGeometry.setAttribute("position", new THREE.Float32BufferAttribute(linePositions, 3));
    lineGeometry.setAttribute("color", new THREE.Float32BufferAttribute(lineColors, 3));
    
    const lineMaterial = new THREE.LineBasicMaterial({
      color: 0x1e3a8a,
      transparent: true,
      opacity: 0.12, // Subtle light-gray/blue connections mesh
      blending: THREE.NormalBlending
    });
    
    const lines = new THREE.LineSegments(lineGeometry, lineMaterial);
    scene.add(lines);

    // Subtle Core Globe Structure
    const coreGeo = new THREE.IcosahedronGeometry(7, 2);
    
    // Solid colored inner core
    const coreSolidMat = new THREE.MeshBasicMaterial({
      color: 0x3b82f6, // Vibrant blue
      transparent: true,
      opacity: 0.15,
    });
    const coreSolidMesh = new THREE.Mesh(coreGeo, coreSolidMat);
    scene.add(coreSolidMesh);

    // Wireframe overlay
    const coreWireMat = new THREE.MeshBasicMaterial({
      color: 0x60a5fa, // Lighter blue wireframe
      wireframe: true,
      transparent: true,
      opacity: 0.35,
    });
    const coreWireMesh = new THREE.Mesh(coreGeo, coreWireMat);
    scene.add(coreWireMesh);

    // Mouse interactive controls
    let targetX = 0;
    let targetY = 0;
    const windowHalfX = width / 2;
    const windowHalfY = height / 2;

    const onMouseMove = (event: MouseEvent) => {
      targetX = (event.clientX - windowHalfX) * 0.0008;
      targetY = (event.clientY - windowHalfY) * 0.0008;
    };
    window.addEventListener("mousemove", onMouseMove);

    // Resize handler
    const handleResize = () => {
      if (!containerRef.current) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener("resize", handleResize);

    // Animation Loop
    let animationId: number;
    const animate = () => {
      animationId = requestAnimationFrame(animate);

      // Slow rotation
      particleSystem.rotation.y += 0.001;
      particleSystem.rotation.x += 0.0003;

      lines.rotation.y = particleSystem.rotation.y;
      lines.rotation.x = particleSystem.rotation.x;

      coreSolidMesh.rotation.y -= 0.0006;
      coreWireMesh.rotation.y -= 0.0006;

      // Mouse inertia rotation
      particleSystem.rotation.y += (targetX - particleSystem.rotation.y) * 0.05;
      particleSystem.rotation.x += (targetY - particleSystem.rotation.x) * 0.05;

      renderer.render(scene, camera);
    };
    animate();

    // Cleanup
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(animationId);
      if (containerRef.current && renderer.domElement) {
        containerRef.current.removeChild(renderer.domElement);
      }
      geometry.dispose();
      material.dispose();
      lineGeometry.dispose();
      lineMaterial.dispose();
      coreGeo.dispose();
      coreSolidMat.dispose();
      coreWireMat.dispose();
    };
  }, []);

  return (
    <div className="relative w-full h-[320px] md:h-[450px] lg:h-[500px] flex items-center justify-center">
      {/* Decorative Blur Ring background */}
      <div className="absolute w-72 h-72 rounded-full bg-indigo-500/10 filter blur-3xl pointer-events-none" />
      <div ref={containerRef} className="w-full h-full cursor-grab active:cursor-grabbing" />
    </div>
  );
}
