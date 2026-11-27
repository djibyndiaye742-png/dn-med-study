"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Html, useGLTF } from "@react-three/drei";
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js";
import {
  modelUrl,
  ANATOMY_BY_KEY,
  structuresFor,
  ATTRIBUTION,
} from "open-anatomy-3d";

import {
  Search,
  RotateCcw,
  X,
  Eye,
  EyeOff,
  Bone,
  Activity,
  Heart,
  Brain,
  ChevronDown,
  Info,
  Layers,
} from "lucide-react";

const SYSTEMS = [
  { id: "skin", label: "Peau", color: "#D9A17C" },
  { id: "skeleton", label: "Os", color: "#E9DCC1" },
  { id: "muscles", label: "Muscles", color: "#A83232" },
  { id: "organs", label: "Organes", color: "#D87955" },
  { id: "vessels", label: "Vaisseaux", color: "#D52F3D" },
  { id: "nerves", label: "Nerfs", color: "#E8C84A" },
];

const normalize = (value = "") =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

function getColor(info) {
  if (!info) return "#B8C2CC";

  const key = `${info.key || ""} ${info.category || ""}`.toLowerCase();

  if (info.system === "muscles") return "#A83232";
  if (info.system === "skeleton") return "#E9DCC1";
  if (info.system === "nerves") return "#E8C84A";
  if (info.system === "skin") return "#D9A17C";

  if (info.system === "vessels") {
    if (key.includes("vein") || key.includes("veine")) {
      return "#2868C7";
    }
    return "#D52F3D";
  }

  return info.color || "#D87955";
}

function AnatomyModel({
  sex,
  selected,
  onSelect,
  visibleSystems,
  isolated,
}) {
  const { scene } = useGLTF(
    modelUrl(sex),
    false,
    false,
    (loader) => loader.setMeshoptDecoder(MeshoptDecoder)
  );

  const model = useMemo(() => {
    const copy = scene.clone(true);

    copy.traverse((object) => {
      if (!object.isMesh) return;

      const info = ANATOMY_BY_KEY[object.name];

      if (!info) return;

      const materials = Array.isArray(object.material)
        ? object.material
        : [object.material];

      const updated = materials.map((original) => {
        const material = original.clone();
        material.color.set(getColor(info));
        material.roughness = 0.75;
        material.metalness = 0.02;
        material.transparent = false;
        material.opacity = 1;
        return material;
      });

      object.material = Array.isArray(object.material)
        ? updated
        : updated[0];

      object.userData.anatomyKey = info.key;
    });

    return copy;
  }, [scene]);

  useEffect(() => {
    model.traverse((object) => {
      if (!object.isMesh) return;

      const info = ANATOMY_BY_KEY[object.name];
      if (!info) return;

      const systemVisible = visibleSystems.includes(info.system);
      const isolatedVisible = !isolated || info.key === isolated;

      object.visible = systemVisible && isolatedVisible;

      const materials = Array.isArray(object.material)
        ? object.material
        : [object.material];

      materials.forEach((material) => {
        if (!material) return;

        if (material.emissive) {
          material.emissive.set(
            selected === info.key ? "#287BFF" : "#000000"
          );
          material.emissiveIntensity =
            selected === info.key ? 0.45 : 0;
        }
      });
    });
  }, [model, visibleSystems, selected, isolated]);

  function handlePointerDown(event) {
    event.stopPropagation();

    const object = event.object;
    const key =
      object?.userData?.anatomyKey || object?.name;

    if (key && ANATOMY_BY_KEY[key]) {
      onSelect(key);
    }
  }

  return (
    <primitive
      object={model}
      onPointerDown={handlePointerDown}
    />
  );
}

function LoadingModel() {
  return (
    <Html center>
      <div style={{ color: "#fff", fontSize: 14 }}>
        Chargement du modèle...
      </div>
    </Html>
  );
}

export default function Anatomie3D() {
  const [sex, setSex] = useState("male");
  const [selected, setSelected] = useState("");
  const [search, setSearch] = useState("");
  const [visibleSystems, setVisibleSystems] = useState(
    SYSTEMS.map((system) => system.id)
  );
  const [isolated, setIsolated] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [showLayers, setShowLayers] = useState(false);
  const [showInfo, setShowInfo] = useState(true);

  const structures = useMemo(() => {
    return structuresFor(sex) || [];
  }, [sex]);

  const selectedInfo = selected
    ? ANATOMY_BY_KEY[selected]
    : null;

  const filteredStructures = useMemo(() => {
    const query = normalize(search.trim());

    if (!query) return [];

    return structures
      .filter((item) => {
        const text = normalize(
          `${item.label} ${item.key} ${item.system} ${item.category}`
        );

        return text.includes(query);
      })
      .slice(0, 30);
  }, [structures, search]);

  function toggleSystem(id) {
    setVisibleSystems((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id]
    );

    setIsolated("");
  }

  function selectStructure(key) {
    setSelected(key);
    setIsolated("");
    setSearch("");
    setShowSearch(false);
    setShowInfo(true);
  }

  function resetView() {
    setSelected("");
    setIsolated("");
    setVisibleSystems(SYSTEMS.map((item) => item.id));
  }

  function isolateStructure() {
    if (!selectedInfo) return;

    setIsolated((current) =>
      current === selected ? "" : selected
    );
  }

  const pageStyle = {
    background: "#0B1420",
    color: "#F8FAFC",
    minHeight: "100%",
    width: "100%",
    overflow: "hidden",
    fontFamily: "Arial, sans-serif",
  };

  const buttonStyle = {
    border: "1px solid #334155",
    background: "#172536",
    color: "#F8FAFC",
    borderRadius: 12,
    padding: "10px 13px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    fontSize: 13,
    cursor: "pointer",
    whiteSpace: "nowrap",
  };

  return (
    <div style={pageStyle}>
      <div
        style={{
          padding: "16px 14px 10px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div>
          <div style={{ fontSize: 21, fontWeight: 800 }}>
            Anatomie 3D
          </div>
          <div style={{ color: "#94A3B8", fontSize: 12, marginTop: 4 }}>
            Atlas anatomique interactif
          </div>
        </div>

        <button
          style={buttonStyle}
          onClick={() => setShowSearch(!showSearch)}
        >
          <Search size={17} />
          Rechercher
        </button>
      </div>

      {showSearch && (
        <div style={{ padding: "5px 14px 12px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              background: "#172536",
              border: "1px solid #334155",
              borderRadius: 12,
              padding: "0 12px",
            }}
          >
            <Search size={18} color="#94A3B8" />

            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Ex : cœur, foie, biceps..."
              autoFocus
              style={{
                flex: 1,
                minWidth: 0,
                background: "transparent",
                border: 0,
                outline: 0,
                color: "white",
                padding: 13,
                fontSize: 14,
              }}
            />

            <button
              onClick={() => {
                setSearch("");
                setShowSearch(false);
              }}
              style={{
                border: 0,
                background: "transparent",
                color: "#94A3B8",
              }}
            >
              <X size={18} />
            </button>
          </div>

          {search.trim() !== "" && (
            <div
              style={{
                marginTop: 7,
                background: "#172536",
                borderRadius: 12,
                maxHeight: 190,
                overflowY: "auto",
              }}
            >
              {filteredStructures.length === 0 ? (
                <div style={{ padding: 14, color: "#94A3B8" }}>
                  Aucune structure trouvée.
                </div>
              ) : (
                filteredStructures.map((item) => (
                  <button
                    key={item.key}
                    onClick={() => selectStructure(item.key)}
                    style={{
                      width: "100%",
                      padding: 12,
                      background: "transparent",
                      border: 0,
                      borderBottom: "1px solid #26384B",
                      color: "white",
                      textAlign: "left",
                      cursor: "pointer",
                    }}
                  >
                    <div style={{ fontWeight: 600 }}>
                      {item.label}
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        color: "#94A3B8",
                        marginTop: 3,
                      }}
                    >
                      {item.system}
                    </div>
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      )}

      <div
        style={{
          display: "flex",
          gap: 8,
          padding: "4px 14px 12px",
          overflowX: "auto",
        }}
      >
        <button
          style={{
            ...buttonStyle,
            background: sex === "male" ? "#2563EB" : "#172536",
            borderColor: sex === "male" ? "#2563EB" : "#334155",
          }}
          onClick={() => {
            setSex("male");
            resetView();
          }}
        >
          Homme
        </button>

        <button
          style={{
            ...buttonStyle,
            background: sex === "female" ? "#2563EB" : "#172536",
            borderColor: sex === "female" ? "#2563EB" : "#334155",
          }}
          onClick={() => {
            setSex("female");
            resetView();
          }}
        >
          Femme
        </button>

        <button
          style={buttonStyle}
          onClick={() => setShowLayers(!showLayers)}
        >
          <Layers size={16} />
          Systèmes
          <ChevronDown size={14} />
        </button>

        <button style={buttonStyle} onClick={resetView}>
          <RotateCcw size={16} />
        </button>
      </div>

      {showLayers && (
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 8,
            padding: "0 14px 12px",
          }}
        >
          {SYSTEMS.map((system) => {
            const active = visibleSystems.includes(system.id);

            return (
              <button
                key={system.id}
                onClick={() => toggleSystem(system.id)}
                style={{
                  ...buttonStyle,
                  background: active ? "#24364A" : "#111C29",
                  borderColor: active ? system.color : "#334155",
                  opacity: active ? 1 : 0.55,
                }}
              >
                <span
                  style={{
                    width: 9,
                    height: 9,
                    borderRadius: "50%",
                    background: system.color,
                  }}
                />
                {system.label}
                {active ? <Eye size={14} /> : <EyeOff size={14} />}
              </button>
            );
          })}
        </div>
      )}

      <div
        style={{
          position: "relative",
          height: "min(66vh, 650px)",
          minHeight: 390,
          background:
            "radial-gradient(circle at 50% 42%, #26394B 0%, #101D2B 55%, #0B1420 100%)",
        }}
      >
        <Canvas
          camera={{ position: [0, 0, 4.5], fov: 38 }}
          dpr={[1, 1.7]}
          gl={{ antialias: true, alpha: true }}
        >
          <ambientLight intensity={1.1} />
          <directionalLight
            position={[4, 6, 5]}
            intensity={2}
          />
          <directionalLight
            position={[-4, 2, -3]}
            intensity={0.8}
          />

          <Suspense fallback={<LoadingModel />}>
            <AnatomyModel
              sex={sex}
              selected={selected}
              onSelect={selectStructure}
              visibleSystems={visibleSystems}
              isolated={isolated}
            />
          </Suspense>

          <OrbitControls
            enablePan={false}
            enableZoom
            minDistance={2}
            maxDistance={9}
            rotateSpeed={0.8}
            zoomSpeed={0.8}
          />
        </Canvas>

        <div
          style={{
            position: "absolute",
            top: 12,
            right: 12,
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          <button
            onClick={() => setShowInfo(!showInfo)}
            style={{
              ...buttonStyle,
              width: 43,
              height: 43,
              padding: 0,
            }}
            title="Informations"
          >
            <Info size={19} />
          </button>
        </div>

        {selectedInfo && showInfo && (
          <div
            style={{
              position: "absolute",
              left: 12,
              right: 12,
              bottom: 12,
              background: "rgba(15, 29, 44, 0.96)",
              border: "1px solid #3B5269",
              borderRadius: 17,
              padding: 15,
              boxShadow: "0 8px 30px #0008",
              backdropFilter: "blur(12px)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 10,
              }}
            >
              <div>
                <div
                  style={{
                    color: "#60A5FA",
                    fontSize: 11,
                    fontWeight: 700,
                    textTransform: "uppercase",
                  }}
                >
                  Structure sélectionnée
                </div>

                <div
                  style={{
                    fontSize: 20,
                    fontWeight: 800,
                    marginTop: 5,
                  }}
                >
                  {selectedInfo.label}
                </div>

                <div
                  style={{
                    color: "#A8B7C8",
                    fontSize: 12,
                    marginTop: 5,
                  }}
                >
                  {selectedInfo.system} · {selectedInfo.category}
                </div>
              </div>

              <button
                onClick={() => {
                  setSelected("");
                  setIsolated("");
                }}
                style={{
                  border: 0,
                  background: "transparent",
                  color: "#94A3B8",
                  alignSelf: "flex-start",
                }}
              >
                <X size={20} />
              </button>
            </div>

            <button
              onClick={isolateStructure}
              style={{
                ...buttonStyle,
                width: "100%",
                marginTop: 13,
                background: isolated === selected ? "#2563EB" : "#263B52",
              }}
            >
              {isolated === selected
                ? "Afficher toutes les structures"
                : "Isoler cette structure"}
            </button>
          </div>
        )}
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "center",
          gap: 16,
          padding: "12px 8px 16px",
          color: "#94A3B8",
          fontSize: 11,
          flexWrap: "wrap",
        }}
      >
        <span>Un doigt : tourner</span>
        <span>Deux doigts : zoomer</span>
        <span>Toucher : sélectionner</span>
      </div>
    </div>
  );
}
