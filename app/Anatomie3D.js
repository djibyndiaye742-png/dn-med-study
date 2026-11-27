"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Html, useGLTF } from "@react-three/drei";
import {
  modelUrl,
  ANATOMY_BY_KEY,
  ATTRIBUTION,
} from "open-anatomy-3d";

const SYSTEMS = [
  { id: "skin", label: "Peau" },
  { id: "skeleton", label: "Squelette" },
  { id: "muscles", label: "Muscles" },
  { id: "organs", label: "Organes" },
  { id: "vessels", label: "Vaisseaux" },
  { id: "nerves", label: "Nerfs" },
];

function HumanBody({ sex, layers, onSelect }) {
  // Le troisième argument active le décodeur Meshopt.
  const { scene } = useGLTF(modelUrl(sex), false, true);

  const model = useMemo(() => scene.clone(true), [scene]);

  useEffect(() => {
    model.traverse((object) => {
      if (Object.prototype.hasOwnProperty.call(layers, object.name)) {
        object.visible = layers[object.name];
      }
    });
  }, [model, layers]);

  return (
    <primitive
      object={model}
      onClick={(event) => {
        event.stopPropagation();

        const key = event.object.name;
        if (ANATOMY_BY_KEY[key]) {
          onSelect(key);
        }
      }}
    />
  );
}

function Loading() {
  return (
    <Html center>
      <div style={{ color: "#2563eb", fontWeight: 700 }}>
        Chargement de l'anatomie 3D...
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

  const structure = selected
    ? ANATOMY_BY_KEY[selected]
    : null;

  function toggleLayer(id) {
    setLayers((previous) => ({
      ...previous,
      [id]: !previous[id],
    }));
  }

  return (
    <div style={{
      padding: 16,
      color: "#10243A",
      width: "100%",
    }}>

      <h1 style={{
        fontSize: 25,
        fontWeight: 800,
        marginBottom: 6,
      }}>
        Anatomie 3D
      </h1>

      <p style={{
        color: "#64748b",
        marginBottom: 18,
      }}>
        Explore le corps humain et découvre ses structures anatomiques.
      </p>

      <div style={{
        display: "flex",
        gap: 10,
        marginBottom: 15,
      }}>
        {[
          { id: "male", label: "Masculin" },
          { id: "female", label: "Féminin" },
        ].map((item) => (
          <button
            key={item.id}
            onClick={() => {
              setSex(item.id);
              setSelected(null);
            }}
            style={{
              padding: "10px 16px",
              borderRadius: 10,
              border: 0,
              background:
                sex === item.id ? "#2563eb" : "#e2e8f0",
              color:
                sex === item.id ? "white" : "#10243A",
              fontWeight: 600,
            }}
          >
            {item.label}
          </button>
        ))}
      </div>

      <h3 style={{
        fontWeight: 700,
        marginBottom: 10,
      }}>
        Systèmes anatomiques
      </h3>

      <div style={{
        display: "flex",
        flexWrap: "wrap",
        gap: 8,
        marginBottom: 15,
      }}>
        {SYSTEMS.map((system) => (
          <button
            key={system.id}
            onClick={() => toggleLayer(system.id)}
            style={{
              padding: "9px 12px",
              borderRadius: 9,
              border: "1px solid #cbd5e1",
              background: layers[system.id]
                ? "#dbeafe"
                : "white",
              color: "#10243A",
              fontWeight: 600,
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
        border: "1px solid #dbe3ed",
      }}>
        <Canvas
          camera={{
            position: [0, 1, 4],
            fov: 40,
          }}
          dpr={[1, 1.5]}
        >
          <ambientLight intensity={1.5} />

          <directionalLight
            position={[3, 5, 4]}
            intensity={2}
          />

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
        marginTop: 16,
        padding: 16,
        borderRadius: 12,
        background: "#f1f5f9",
      }}>
        <h3 style={{
          fontWeight: 700,
          marginBottom: 10,
        }}>
          Structure anatomique
        </h3>

        {structure ? (
          <>
            <p style={{
              fontSize: 20,
              color: "#2563eb",
              fontWeight: 700,
            }}>
              {structure.label}
            </p>

            <p>
              Système : {structure.system}
            </p>

            <p>
              Catégorie : {structure.category}
            </p>
          </>
        ) : (
          <p style={{ color: "#64748b" }}>
            Sélectionne une structure sur le modèle 3D.
          </p>
        )}
      </div>

      <p style={{
        marginTop: 18,
        fontSize: 11,
        color: "#64748b",
      }}>
        {ATTRIBUTION}
      </p>

      <p style={{
        fontSize: 11,
        color: "#64748b",
      }}>
        Modèle pédagogique. Ne constitue pas un dispositif médical.
      </p>

    </div>
  );
}
