"use client";

import {
  Suspense,
  useEffect,
  useMemo,
  useState
} from "react";

import { Canvas } from "@react-three/fiber";

import {
  OrbitControls,
  Html,
  useGLTF
} from "@react-three/drei";

import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js";

import {
  modelUrl,
  ANATOMY_BY_KEY,
  ANATOMY_STRUCTURES,
  ATTRIBUTION,
  structuresFor
} from "open-anatomy-3d";


const SYSTEMS = [
  { id: "skin", label: "Peau", color: "#E8B89A" },
  { id: "skeleton", label: "Squelette", color: "#F5E8C8" },
  { id: "muscles", label: "Muscles", color: "#C84B50" },
  { id: "organs", label: "Organes", color: "#D97757" },
  { id: "vessels", label: "Vaisseaux", color: "#D93652" },
  { id: "nerves", label: "Nerfs", color: "#E6BD36" }
];


function HumanBody({
  sex,
  layers,
  selected,
  isolate,
  onSelect
}) {

  const { scene } = useGLTF(
    modelUrl(sex),
    false,
    false,
    (loader) => {
      loader.setMeshoptDecoder(MeshoptDecoder);
    }
  );

  const model = useMemo(() => {

    const cloned = scene.clone(true);

    cloned.traverse((object) => {

      if (!object.isMesh) return;

      const info = ANATOMY_BY_KEY[object.name];

      if (!info) return;

      const materials = Array.isArray(object.material)
        ? object.material
        : [object.material];

      const coloredMaterials = materials.map((material) => {

        const copy = material.clone();

        if (info.color && copy.color) {
          copy.color.set(info.color);
        }

        return copy;
      });

      object.material = Array.isArray(object.material)
        ? coloredMaterials
        : coloredMaterials[0];

    });

    return cloned;

  }, [scene]);


  useEffect(() => {

    model.traverse((object) => {

      if (
        SYSTEMS.some(system => system.id === object.name)
      ) {
        object.visible = layers[object.name] !== false;
      }

      if (object.isMesh && ANATOMY_BY_KEY[object.name]) {

        object.visible = isolate && selected
          ? object.name === selected
          : true;

      }

    });

  }, [model, layers, selected, isolate]);


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
      <div style={{
        background: "white",
        padding: 15,
        borderRadius: 12,
        color: "#2563eb",
        fontWeight: 700
      }}>
        Chargement du corps humain...
      </div>
    </Html>
  );
}


export default function Anatomie3D() {

  const [sex, setSex] = useState("male");

  const [layers, setLayers] = useState({
    skin: true,
    skeleton: true,
    muscles: true,
    organs: true,
    vessels: false,
    nerves: false
  });

  const [selected, setSelected] = useState(null);

  const [isolate, setIsolate] = useState(false);

  const [search, setSearch] = useState("");

  const availableStructures = useMemo(
    () => structuresFor(sex),
    [sex]
  );

  const filteredStructures = useMemo(() => {

    const term = search.trim().toLowerCase();

    if (!term) return availableStructures.slice(0, 40);

    return availableStructures.filter(item =>
      item.label.toLowerCase().includes(term) ||
      item.key.toLowerCase().includes(term) ||
      item.system.toLowerCase().includes(term)
    ).slice(0, 40);

  }, [availableStructures, search]);


  const structure = selected
    ? ANATOMY_BY_KEY[selected]
    : null;


  function toggleLayer(id) {

    setLayers(previous => ({
      ...previous,
      [id]: !previous[id]
    }));

  }


  function selectStructure(key) {

    setSelected(key);
    setIsolate(false);

  }


  return (

    <div style={{
      width: "100%",
      padding: 14,
      color: "#10243A",
      boxSizing: "border-box"
    }}>

      <div style={{
        marginBottom: 20
      }}>

        <h1 style={{
          fontSize: 27,
          fontWeight: 850,
          margin: 0
        }}>
          Anatomie 3D
        </h1>

        <p style={{
          color: "#64748b",
          fontSize: 14,
          marginTop: 7
        }}>
          Atlas anatomique interactif pour étudiants en médecine.
        </p>

      </div>


      {/* SEXE */}

      <div style={{
        display: "flex",
        gap: 9,
        marginBottom: 18
      }}>

        {[
          { id: "male", label: "Masculin" },
          { id: "female", label: "Féminin" }
        ].map(item => (

          <button
            key={item.id}
            onClick={() => {
              setSex(item.id);
              setSelected(null);
              setIsolate(false);
            }}
            style={{
              padding: "11px 18px",
              borderRadius: 10,
              border: 0,
              background: sex === item.id
                ? "#2563eb"
                : "#e2e8f0",
              color: sex === item.id
                ? "white"
                : "#10243A",
              fontWeight: 700
            }}
          >
            {item.label}
          </button>

        ))}

      </div>


      {/* SYSTEMES */}

      <h3 style={{
        fontSize: 16,
        fontWeight: 800,
        marginBottom: 10
      }}>
        Systèmes anatomiques
      </h3>


      <div style={{
        display: "flex",
        flexWrap: "wrap",
        gap: 8,
        marginBottom: 17
      }}>

        {SYSTEMS.map(system => (

          <button
            key={system.id}
            onClick={() => toggleLayer(system.id)}
            style={{
              border: `1px solid ${system.color}`,
              borderRadius: 9,
              padding: "9px 12px",
              background: layers[system.id]
                ? system.color
                : "white",
              color: "#10243A",
              fontWeight: 700,
              fontSize: 12
            }}
          >
            {layers[system.id] ? "✓ " : ""}
            {system.label}
          </button>

        ))}

      </div>


      {/* MODELE 3D */}

      <div style={{
        height: 460,
        width: "100%",
        borderRadius: 16,
        overflow: "hidden",
        background: "#EAF0F6",
        border: "1px solid #CBD5E1",
        position: "relative"
      }}>

        <Canvas
          camera={{
            position: [0, 1, 4],
            fov: 40
          }}
          dpr={[1, 1.25]}
          gl={{
            antialias: true,
            alpha: false
          }}
        >

          <color attach="background" args={["#EAF0F6"]} />

          <ambientLight intensity={1.8} />

          <directionalLight
            position={[4, 6, 5]}
            intensity={2}
          />

          <directionalLight
            position={[-4, 2, -3]}
            intensity={0.8}
          />

          <Suspense fallback={<Loading />}>

            <HumanBody
              sex={sex}
              layers={layers}
              selected={selected}
              isolate={isolate}
              onSelect={selectStructure}
            />

          </Suspense>

          <OrbitControls
            target={[0, 0.9, 0]}
            enablePan
            enableZoom
            minDistance={1.5}
            maxDistance={8}
          />

        </Canvas>


        <div style={{
          position: "absolute",
          bottom: 10,
          left: 10,
          background: "rgba(255,255,255,0.9)",
          padding: "7px 10px",
          borderRadius: 8,
          fontSize: 11,
          color: "#475569"
        }}>
          Fais glisser pour tourner • Pince pour zoomer
        </div>

      </div>


      {/* STRUCTURE SELECTIONNEE */}

      <div style={{
        marginTop: 17,
        padding: 16,
        background: "white",
        border: "1px solid #E2E8F0",
        borderRadius: 13
      }}>

        <h3 style={{
          fontWeight: 800,
          marginTop: 0
        }}>
          Structure sélectionnée
        </h3>


        {structure ? (

          <>

            <div style={{
              fontSize: 22,
              fontWeight: 850,
              color: "#2563eb",
              marginBottom: 10
            }}>
              {structure.label}
            </div>

            <p>
              <strong>Système :</strong> {structure.system}
            </p>

            <p>
              <strong>Catégorie :</strong> {structure.category}
            </p>

            <div style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 8,
              marginTop: 13
            }}>

              <button
                onClick={() => setIsolate(true)}
                style={{
                  padding: "10px 13px",
                  border: 0,
                  borderRadius: 9,
                  background: "#2563eb",
                  color: "white",
                  fontWeight: 700
                }}
              >
                Isoler cette structure
              </button>

              <button
                onClick={() => {
                  setIsolate(false);
                  setSelected(null);
                }}
                style={{
                  padding: "10px 13px",
                  border: 0,
                  borderRadius: 9,
                  background: "#e2e8f0",
                  color: "#10243A",
                  fontWeight: 700
                }}
              >
                Tout afficher
              </button>

            </div>

          </>

        ) : (

          <p style={{
            color: "#64748b",
            fontSize: 13
          }}>
            Clique directement sur une structure du corps
            ou recherche un organe ci-dessous.
          </p>

        )}

      </div>


      {/* RECHERCHE */}

      <div style={{
        marginTop: 20
      }}>

        <h3 style={{
          fontWeight: 800
        }}>
          Explorer les structures
        </h3>

        <input
          type="search"
          value={search}
          onChange={event => setSearch(event.target.value)}
          placeholder="Rechercher : cœur, foie, cerveau..."
          style={{
            width: "100%",
            boxSizing: "border-box",
            padding: 13,
            borderRadius: 10,
            border: "1px solid #CBD5E1",
            outline: "none",
            fontSize: 14,
            marginBottom: 12
          }}
        />


        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
          gap: 8,
          maxHeight: 320,
          overflowY: "auto"
        }}>

          {filteredStructures.map(item => (

            <button
              key={item.key}
              onClick={() => selectStructure(item.key)}
              style={{
                textAlign: "left",
                padding: 11,
                borderRadius: 9,
                border: selected === item.key
                  ? "2px solid #2563eb"
                  : "1px solid #E2E8F0",
                background: selected === item.key
                  ? "#EFF6FF"
                  : "white",
                color: "#10243A",
                fontWeight: 650,
                fontSize: 12
              }}
            >
              {item.label}
            </button>

          ))}

        </div>

        {filteredStructures.length === 0 && (

          <p style={{
            color: "#64748b",
            fontSize: 13
          }}>
            Aucune structure trouvée.
          </p>

        )}

      </div>


      {/* ATTRIBUTION */}

      <div style={{
        marginTop: 20,
        padding: 12,
        background: "#F1F5F9",
        borderRadius: 10,
        color: "#64748b",
        fontSize: 10,
        lineHeight: 1.6
      }}>

        {ATTRIBUTION}

        <p>
          Modèle pédagogique destiné à l'apprentissage
          et à la visualisation anatomique. Ne constitue
          pas un dispositif médical.
        </p>

      </div>

    </div>

  );

            }
