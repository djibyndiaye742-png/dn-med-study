"use client";

import { useEffect, useMemo, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, useGLTF, Html } from "@react-three/drei";
import { modelUrl, ANATOMY_BY_KEY, ATTRIBUTION } from "open-anatomy-3d";
import { Suspense } from "react";

const SYSTEMS = [
  { id: "skin", label: "Peau" },
  { id: "skeleton", label: "Squelette" },
  { id: "muscles", label: "Muscles" },
  { id: "organs", label: "Organes" },
  { id: "vessels", label: "Vaisseaux" },
  { id: "nerves", label: "Nerfs" },
];

function HumanBody({ sex, layers, onSelect }) {
  const { scene } = useGLTF(modelUrl(sex));

  const model = useMemo(() => scene.clone(true), [scene]);

  useEffect(() => {
    model.traverse((object) => {
      if (SYSTEMS.some((system) => system.id === object.name)) {
        object.visible = layers[object.name] !== false;
      }
    });
  }, [model, layers]);

  return (
    <primitive
      object={model}
      onPointerDown={(event) => {
        event.stopPropagation();
        const key = event.object.name;
        if (ANATOMY_BY_KEY[key]) onSelect(key);
      }}
    />
  );
}

function Loading() {
  return (
    <Html center>
      <div style={{ color: "#2563eb", fontWeight: "bold" }}>
        Chargement du corps humain...
      </div>
    </Html>
  );
}

export default function Anatomie3D() {
  const [sex, setSex] = useState("male");
  const [layers, setLayers] = useState({
    skin: true,
    skeleton: false,
    muscles: true,
    organs: true,
    vessels: false,
    nerves: false,
  });
  const [selected, setSelected] = useState(null);

  const structure = selected ? ANATOMY_BY_KEY[selected] : null;

  function toggleLayer(id) {
    setLayers((previous) => ({
      ...previous,
      [id]: !previous[id],
    }));
  }

  return (
    <div style={{ padding: 16, color: "#10243A" }}>
      <h1 style={{ fontSize: 25, fontWeight: 800 }}>
        Anatomie 3D
      </h1>

      <p style={{ color: "#64748b", marginBottom: 18 }}>
        Explore le corps humain et découvre ses structures anatomiques.
      </p>

      <div style={{
        display: "flex",
        gap: 10,
        marginBottom: 15
      }}>
        <button
          onClick={() => setSex("male")}
          style={{
            padding: "10px 16px",
            borderRadius: 10,
            background: sex === "male" ? "#2563eb" : "#e2e8f0",
            color: sex === "male" ? "white" : "#10243A",
            border: 0
          }}
        >
          Masculin
        </button>

        <button
          onClick={() => setSex("female")}
          style={{
            padding: "10px 16px",
            borderRadius: 10,
            background: sex === "female" ? "#2563eb" : "#e2e8f0",
            color: sex === "female" ? "white" : "#10243A",
            border: 0
          }}
        >
          Féminin
        </button>
      </div>

      <div style={{
        display: "flex",
        flexWrap: "wrap",
        gap: 8,
        marginBottom: 15
      }}>
        {SYSTEMS.map((system) => (
          <button
            key={system.id}
            onClick={() => toggleLayer(system.id)}
            style={{
              padding: "8px 11px",
              borderRadius: 9,
              border: "1px solid #cbd5e1",
              background: layers[system.id] ? "#dbeafe" : "white",
              color: "#10243A"
            }}
          >
            {layers[system.id] ? "✓ " : ""}
            {system.label}
          </button>
        ))}
      </div>

      <div style={{
        height: 520,
        width: "100%",
        borderRadius: 16,
        overflow: "hidden",
        background: "#edf3fa",
        border: "1px solid #dbe3ed"
      }}>
        <Canvas
          camera={{ position: [0, 1, 4], fov: 40 }}
          dpr={[1, 1.5]}
        >
          <ambientLight intensity={1.5} />
          <directionalLight position={[3, 5, 4]} intensity={2} />

          <Suspense fallback={<Loading />}>
            <HumanBody
              sex={sex}
              layers={layers}
              onSelect={setSelected}
            />
          </Suspense>

          <OrbitControls
            enablePan
            enableZoom
            minDistance={1.5}
            maxDistance={8}
          />
        </Canvas>
      </div>

      <div style={{
        marginTop: 15,
        padding: 15,
        borderRadius: 12,
        background: "#f1f5f9"
      }}>
        <h3 style={{ fontWeight: 700 }}>
          Structure anatomique sélectionnée
        </h3>

        {structure ? (
          <>
            <p style={{ fontSize: 20, color: "#2563eb", fontWeight: 700 }}>
              {structure.label}
            </p>
            <p>Système : {structure.system}</p>
            <p>Catégorie : {structure.category}</p>
          </>
        ) : (
          <p style={{ color: "#64748b" }}>
            Sélectionne une structure directement sur le corps humain.
          </p>
        )}
      </div>

      <p style={{
        marginTop: 15,
        fontSize: 11,
        color: "#64748b"
      }}>
        {ATTRIBUTION}
      </p>
    </div>
  );
          }
