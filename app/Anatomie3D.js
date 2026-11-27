"use client";

import {
  Suspense,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { Canvas } from "@react-three/fiber";
import { OrbitControls, Html, useGLTF } from "@react-three/drei";
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js";

import {
  modelUrl,
  ANATOMY_BY_KEY,
  structuresFor,
} from "open-anatomy-3d";

import {
  Search,
  RotateCcw,
  X,
  Eye,
  EyeOff,
  ChevronDown,
  Info,
  Layers,
  Scan,
} from "lucide-react";

/* =========================
   SYSTÈMES ANATOMIQUES
========================= */

const SYSTEMS = [
  { id: "skin", label: "Peau", color: "#D9A17C" },
  { id: "skeleton", label: "Squelette", color: "#E9DCC1" },
  { id: "muscles", label: "Muscles", color: "#A83232" },
  { id: "organs", label: "Organes", color: "#D87955" },
  { id: "vessels", label: "Vaisseaux", color: "#D52F3D" },
  { id: "nerves", label: "Nerfs", color: "#E8C84A" },
];

const ALL_SYSTEMS = SYSTEMS.map((item) => item.id);

const normalize = (value = "") =>
  String(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();

/* =========================
   IDENTIFICATION DES SYSTÈMES
========================= */

function getSystemId(info) {
  const value = normalize(
    `${info?.system || ""} ${info?.category || ""}`
  );

  if (
    value.includes("skeleton") ||
    value.includes("skeletal") ||
    value.includes("bone") ||
    value.includes("os")
  ) {
    return "skeleton";
  }

  if (
    value.includes("muscle") ||
    value.includes("muscular")
  ) {
    return "muscles";
  }

  if (
    value.includes("nerve") ||
    value.includes("nervous")
  ) {
    return "nerves";
  }

  if (
    value.includes("vessel") ||
    value.includes("vascular") ||
    value.includes("arter") ||
    value.includes("vein") ||
    value.includes("blood")
  ) {
    return "vessels";
  }

  if (
    value.includes("skin") ||
    value.includes("integument")
  ) {
    return "skin";
  }

  if (
    value.includes("organ") ||
    value.includes("digest") ||
    value.includes("respiratory") ||
    value.includes("urinary") ||
    value.includes("cardiac")
  ) {
    return "organs";
  }

  return info?.system || "organs";
}

/* =========================
   COULEURS ANATOMIQUES
========================= */

function getColor(info) {
  const system = getSystemId(info);

  if (system === "muscles") return "#A83232";
  if (system === "skeleton") return "#E9DCC1";
  if (system === "nerves") return "#E8C84A";
  if (system === "skin") return "#D9A17C";

  if (system === "vessels") {
    const key = normalize(
      `${info?.key || ""} ${info?.label || ""}`
    );

    if (key.includes("vein") || key.includes("veine")) {
      return "#2868C7";
    }

    return "#D52F3D";
  }

  return info?.color || "#D87955";
}

/* =========================
   RECHARGEMENT DU MODÈLE 3D
========================= */

function AnatomyModel({
  sex,
  selected,
  onSelect,
  visibleSystems,
  isolated,
  xray,
  opacity,
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
    const copy = scene.clone(true);

    copy.traverse((object) => {
      if (!object.isMesh) return;

      const info =
        ANATOMY_BY_KEY[object.name] ||
        Object.values(ANATOMY_BY_KEY).find(
          (item) => item.key === object.name
        );

      if (!info) return;

      object.userData.anatomyKey = info.key;
      object.userData.anatomyInfo = info;

      const originalMaterials = Array.isArray(object.material)
        ? object.material
        : [object.material];

      const newMaterials = originalMaterials.map((original) => {
        const material = original.clone();

        material.color.set(getColor(info));
        material.roughness = 0.75;
        material.metalness = 0.02;

        return material;
      });

      object.material = Array.isArray(object.material)
        ? newMaterials
        : newMaterials[0];
    });

    return copy;
  }, [scene]);

  useEffect(() => {
    model.traverse((object) => {
      if (!object.isMesh) return;

      const info = object.userData.anatomyInfo;

      if (!info) return;

      const system = getSystemId(info);

      const systemVisible =
        visibleSystems.includes(system) ||
        !ALL_SYSTEMS.includes(system);

      const isolatedVisible =
        !isolated || info.key === isolated;

      object.visible = systemVisible && isolatedVisible;

      const materials = Array.isArray(object.material)
        ? object.material
        : [object.material];

      materials.forEach((material) => {
        if (!material) return;

        material.transparent = xray;
        material.opacity = xray ? opacity : 1;
        material.depthWrite = !xray;

        if (material.emissive) {
          material.emissive.set(
            selected === info.key ? "#287BFF" : "#000000"
          );

          material.emissiveIntensity =
            selected === info.key ? 0.55 : 0;
        }

        material.needsUpdate = true;
      });
    });
  }, [
    model,
    visibleSystems,
    selected,
    isolated,
    xray,
    opacity,
  ]);

  function handleClick(event) {
    event.stopPropagation();

    const object = event.object;

    const key =
      object?.userData?.anatomyKey ||
      object?.name;

    const info =
      object?.userData?.anatomyInfo ||
      ANATOMY_BY_KEY[key];

    if (info?.key) {
      onSelect(info.key);
    }
  }

  return (
    <primitive
      object={model}
      onClick={handleClick}
    />
  );
}

/* =========================
   CHARGEMENT
========================= */

function LoadingModel() {
  return (
    <Html center>
      <div
        style={{
          color: "#FFFFFF",
          fontSize: 14,
          background: "#172536",
          padding: "13px 18px",
          borderRadius: 12,
          whiteSpace: "nowrap",
        }}
      >
        Chargement de l'anatomie 3D...
      </div>
    </Html>
  );
}

/* =========================
   COMPOSANT PRINCIPAL
========================= */

export default function Anatomie3D() {
  const controlsRef = useRef(null);

  const [sex, setSex] = useState("male");
  const [selected, setSelected] = useState("");
  const [search, setSearch] = useState("");

  const [visibleSystems, setVisibleSystems] =
    useState(ALL_SYSTEMS);

  const [isolated, setIsolated] = useState("");

  const [showSearch, setShowSearch] = useState(false);
  const [showLayers, setShowLayers] = useState(false);
  const [showInfo, setShowInfo] = useState(true);

  const [xray, setXray] = useState(false);
  const [opacity, setOpacity] = useState(0.3);

  /* =========================
     DONNÉES ANATOMIQUES
  ========================= */

  const structures = useMemo(() => {
    return structuresFor(sex) || [];
  }, [sex]);

  const structureMap = useMemo(() => {
    const map = {};

    structures.forEach((item) => {
      map[item.key] = item;
    });

    return map;
  }, [structures]);

  const selectedInfo = selected
    ? structureMap[selected] ||
      ANATOMY_BY_KEY[selected] ||
      null
    : null;

  /* =========================
     RECHERCHE
  ========================= */

  const filteredStructures = useMemo(() => {
    const query = normalize(search);

    if (!query) return [];

    return structures
      .filter((item) => {
        const text = normalize(
          `${item.label} ${item.key} ${item.system} ${item.category}`
        );

        return text.includes(query);
      })
      .slice(0, 40);
  }, [structures, search]);

  /* =========================
     SÉLECTION
  ========================= */

  function selectStructure(key) {
    setSelected(key);
    setIsolated("");
    setShowInfo(true);
    setShowSearch(false);
    setSearch("");
  }

  function clearSelection() {
    setSelected("");
    setIsolated("");
  }

  /* =========================
     SYSTÈMES
  ========================= */

  function toggleSystem(id) {
    setVisibleSystems((current) => {
      if (current.includes(id)) {
        return current.filter((item) => item !== id);
      }

      return [...current, id];
    });

    setIsolated("");
  }

  /* =========================
     ISOLATION
  ========================= */

  function isolateStructure() {
    if (!selectedInfo) return;

    setIsolated((current) =>
      current === selected ? "" : selected
    );
  }

  /* =========================
     RÉINITIALISATION
  ========================= */

  function resetView() {
    setSelected("");
    setIsolated("");
    setSearch("");

    setVisibleSystems(ALL_SYSTEMS);

    setXray(false);
    setOpacity(0.3);

    if (controlsRef.current) {
      controlsRef.current.reset();
    }
  }

  function changeSex(value) {
    setSex(value);
    setSelected("");
    setIsolated("");
    setVisibleSystems(ALL_SYSTEMS);
    setXray(false);
  }

  /* =========================
     STYLES
  ========================= */

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

  const activeButton = {
    ...buttonStyle,
    background: "#2563EB",
    borderColor: "#2563EB",
  };

  /* =========================
     INTERFACE
  ========================= */

  return (
    <div style={pageStyle}>

      {/* EN-TÊTE */}

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

          <div
            style={{
              color: "#94A3B8",
              fontSize: 12,
              marginTop: 4,
            }}
          >
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

      {/* RECHERCHE */}

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
              onChange={(event) =>
                setSearch(event.target.value)
              }
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
                cursor: "pointer",
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
                maxHeight: 220,
                overflowY: "auto",
              }}
            >
              {filteredStructures.length === 0 ? (
                <div
                  style={{
                    padding: 14,
                    color: "#94A3B8",
                  }}
                >
                  Aucune structure trouvée.
                </div>
              ) : (
                filteredStructures.map((item) => (
                  <button
                    key={item.key}
                    onClick={() =>
                      selectStructure(item.key)
                    }
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
                      {item.system} · {item.category}
                    </div>
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      )}

      {/* COMMANDES */}

      <div
        style={{
          display: "flex",
          gap: 8,
          padding: "4px 14px 12px",
          overflowX: "auto",
        }}
      >
        <button
          style={
            sex === "male" ? activeButton : buttonStyle
          }
          onClick={() => changeSex("male")}
        >
          Homme
        </button>

        <button
          style={
            sex === "female" ? activeButton : buttonStyle
          }
          onClick={() => changeSex("female")}
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

        <button
          style={xray ? activeButton : buttonStyle}
          onClick={() => setXray(!xray)}
        >
          <Scan size={16} />
          Rayon X
        </button>

        <button
          style={buttonStyle}
          onClick={resetView}
          title="Réinitialiser"
        >
          <RotateCcw size={16} />
        </button>
      </div>

      {/* PANNEAU DES SYSTÈMES */}

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
            const active = visibleSystems.includes(
              system.id
            );

            return (
              <button
                key={system.id}
                onClick={() => toggleSystem(system.id)}
                style={{
                  ...buttonStyle,
                  background: active
                    ? "#24364A"
                    : "#111C29",
                  borderColor: active
                    ? system.color
                    : "#334155",
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

                {active ? (
                  <Eye size={14} />
                ) : (
                  <EyeOff size={14} />
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* RÉGLAGE RAYONS X */}

      {xray && (
        <div
          style={{
            padding: "0 16px 12px",
            color: "#CBD5E1",
            fontSize: 12,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: 6,
            }}
          >
            <span>Transparence</span>
            <span>{Math.round(opacity * 100)} %</span>
          </div>

          <input
            type="range"
            min="0.1"
            max="0.8"
            step="0.05"
            value={opacity}
            onChange={(event) =>
              setOpacity(Number(event.target.value))
            }
            style={{ width: "100%" }}
          />
        </div>
      )}

      {/* MODÈLE 3D */}

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
          camera={{
            position: [0, 0, 4.5],
            fov: 38,
          }}
          dpr={[1, 1.7]}
          gl={{
            antialias: true,
            alpha: true,
          }}
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
              xray={xray}
              opacity={opacity}
            />
          </Suspense>

          <OrbitControls
            ref={controlsRef}
            enablePan={false}
            enableZoom
            enableRotate
            minDistance={2}
            maxDistance={9}
            rotateSpeed={0.8}
            zoomSpeed={0.8}
          />
        </Canvas>

        {/* BOUTON INFORMATIONS */}

        <div
          style={{
            position: "absolute",
            top: 12,
            right: 12,
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

        {/* STRUCTURE SÉLECTIONNÉE */}

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
                  {selectedInfo.system} ·{" "}
                  {selectedInfo.category}
                </div>
              </div>

              <button
                onClick={clearSelection}
                style={{
                  border: 0,
                  background: "transparent",
                  color: "#94A3B8",
                  alignSelf: "flex-start",
                  cursor: "pointer",
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
                background:
                  isolated === selected
                    ? "#2563EB"
                    : "#263B52",
              }}
            >
              {isolated === selected
                ? "Afficher toutes les structures"
                : "Isoler cette structure"}
            </button>
          </div>
        )}
      </div>

      {/* AIDE */}

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
