"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
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

const SYSTEM_IDS = SYSTEMS.map((s) => s.id);

const normalize = (value = "") =>
  String(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();

/* =========================
   INFORMATIONS DES STRUCTURES
========================= */

function getStructureInfo(object) {
  if (!object) return null;

  return (
    ANATOMY_BY_KEY[object.name] ||
    null
  );
}

function getStructureColor(info) {
  if (!info) return "#B8C2CC";

  const system = info.system;

  if (system === "skin") return "#D9A17C";
  if (system === "skeleton") return "#E9DCC1";
  if (system === "muscles") return "#A83232";
  if (system === "organs") return "#D87955";
  if (system === "nerves") return "#E8C84A";

  if (system === "vessels") {
    const name = normalize(info.key + " " + info.label);

    if (name.includes("vein") || name.includes("veine")) {
      return "#2868C7";
    }

    return "#D52F3D";
  }

  return info.color || "#B8C2CC";
}

/* =========================
   MODÈLE ANATOMIQUE
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

      const info = getStructureInfo(object);

      // Les éléments inconnus ne doivent jamais apparaître.
      if (!info || !SYSTEM_IDS.includes(info.system)) {
        object.visible = false;
        object.userData.anatomyInfo = null;
        return;
      }

      object.userData.anatomyInfo = info;
      object.userData.anatomyKey = info.key;

      // Chaque structure possède son propre matériau.
      const originals = Array.isArray(object.material)
        ? object.material
        : [object.material];

      const materials = originals.map((original) => {
        const material = original.clone();

        material.color.set(getStructureColor(info));
        material.roughness = 0.8;
        material.metalness = 0;

        return material;
      });

      object.material = Array.isArray(object.material)
        ? materials
        : materials[0];
    });

    return copy;
  }, [scene]);

  /* =========================
     VISIBILITÉ ET SÉLECTION
  ========================= */

  useEffect(() => {
    model.traverse((object) => {
      if (!object.isMesh) return;

      const info = object.userData.anatomyInfo;

      // Aucune structure inconnue n'est affichée.
      if (!info || !SYSTEM_IDS.includes(info.system)) {
        object.visible = false;
        return;
      }

      const systemIsVisible =
        visibleSystems.includes(info.system);

      const structureIsVisible =
        !isolated || info.key === isolated;

      object.visible =
        systemIsVisible && structureIsVisible;

      const materials = Array.isArray(object.material)
        ? object.material
        : [object.material];

      materials.forEach((material) => {
        if (!material) return;

        // Mode radiographie.
        material.transparent = xray;
        material.opacity = xray ? opacity : 1;
        material.depthWrite = !xray;

        // Mise en évidence de la structure sélectionnée.
        if (material.emissive) {
          material.emissive.set(
            selected === info.key ? "#287BFF" : "#000000"
          );

          material.emissiveIntensity =
            selected === info.key ? 0.6 : 0;
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

  /* =========================
     SÉLECTION INDIVIDUELLE
  ========================= */

  function handleClick(event) {
    event.stopPropagation();

    const object = event.object;
    const info = object?.userData?.anatomyInfo;

    if (!info || !object.visible) return;

    onSelect(info.key);
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
          color: "white",
          background: "#172536",
          padding: "14px 18px",
          borderRadius: 12,
          fontSize: 13,
          whiteSpace: "nowrap",
        }}
      >
        Chargement de l'anatomie...
      </div>
    </Html>
  );
}

/* =========================
   APPLICATION PRINCIPALE
========================= */

export default function Anatomie3D() {
  const controlsRef = useRef(null);

  const [sex, setSex] = useState("male");

  const [selected, setSelected] = useState("");
  const [isolated, setIsolated] = useState("");

  const [search, setSearch] = useState("");
  const [showSearch, setShowSearch] = useState(false);

  const [showLayers, setShowLayers] = useState(true);
  const [showInfo, setShowInfo] = useState(true);

  // La peau est masquée au départ pour voir les structures internes.
  const [visibleSystems, setVisibleSystems] = useState([
    "skeleton",
    "muscles",
    "organs",
    "vessels",
    "nerves",
  ]);

  const [xray, setXray] = useState(false);
  const [opacity, setOpacity] = useState(0.3);

  /* =========================
     CATALOGUE
  ========================= */

  const structures = useMemo(
    () => structuresFor(sex) || [],
    [sex]
  );

  const structureMap = useMemo(() => {
    const result = {};

    structures.forEach((item) => {
      result[item.key] = item;
    });

    return result;
  }, [structures]);

  const selectedInfo = selected
    ? structureMap[selected] || ANATOMY_BY_KEY[selected]
    : null;

  /* =========================
     RECHERCHE
  ========================= */

  const filteredStructures = useMemo(() => {
    const query = normalize(search);

    if (!query) return [];

    return structures
      .filter((item) => {
        const content = normalize(
          `${item.label} ${item.key} ${item.system} ${item.category}`
        );

        return content.includes(query);
      })
      .slice(0, 40);
  }, [structures, search]);

  /* =========================
     SÉLECTION
  ========================= */

  function selectStructure(key) {
    const info = structureMap[key] || ANATOMY_BY_KEY[key];

    if (!info) return;

    // Si le système est masqué, on le réactive.
    if (!visibleSystems.includes(info.system)) {
      setVisibleSystems((current) => [
        ...current,
        info.system,
      ]);
    }

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
     VISIBILITÉ DES SYSTÈMES
  ========================= */

  function toggleSystem(id) {
    setVisibleSystems((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id]
    );

    setSelected("");
    setIsolated("");
  }

  function showAllSystems() {
    setVisibleSystems(SYSTEM_IDS);
    setIsolated("");
  }

  function hideAllSystems() {
    setVisibleSystems([]);
    setSelected("");
    setIsolated("");
  }

  /* =========================
     ISOLATION INDIVIDUELLE
  ========================= */

  function toggleIsolation() {
    if (!selectedInfo) return;

    setIsolated((current) =>
      current === selected ? "" : selected
    );
  }

  /* =========================
     CHANGEMENT DU CORPS
  ========================= */

  function changeSex(value) {
    setSex(value);
    setSelected("");
    setIsolated("");
  }

  /* =========================
     RÉINITIALISATION
  ========================= */

  function resetView() {
    setSelected("");
    setIsolated("");
    setSearch("");

    setVisibleSystems([
      "skeleton",
      "muscles",
      "organs",
      "vessels",
      "nerves",
    ]);

    setXray(false);
    setOpacity(0.3);

    controlsRef.current?.reset();
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
     AFFICHAGE
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
            Exploration anatomique interactive
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
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher un muscle, un os, un organe..."
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
                maxHeight: 230,
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
          style={sex === "male" ? activeButton : buttonStyle}
          onClick={() => changeSex("male")}
        >
          Homme
        </button>

        <button
          style={sex === "female" ? activeButton : buttonStyle}
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
        <div style={{ padding: "0 14px 12px" }}>

          <div
            style={{
              display: "flex",
              gap: 8,
              marginBottom: 9,
            }}
          >
            <button
              style={buttonStyle}
              onClick={showAllSystems}
            >
              Tout afficher
            </button>

            <button
              style={buttonStyle}
              onClick={hideAllSystems}
            >
              Tout masquer
            </button>
          </div>

          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 8,
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

                  {active ? (
                    <Eye size={14} />
                  ) : (
                    <EyeOff size={14} />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* TRANSPARENCE */}

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
            onChange={(e) => setOpacity(Number(e.target.value))}
            style={{ width: "100%" }}
          />
        </div>
      )}

      {/* SCÈNE 3D */}

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

        {/* INFORMATIONS */}

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
              background: "rgba(15, 29, 44, 0.97)",
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
              onClick={toggleIsolation}
              style={{
                ...buttonStyle,
                width: "100%",
                marginTop: 13,
                background:
                  isolated === selected ? "#2563EB" : "#263B52",
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
          padding: "12px 8px 8px",
          color: "#94A3B8",
          fontSize: 11,
          flexWrap: "wrap",
        }}
      >
        <span>Un doigt : tourner</span>
        <span>Deux doigts : zoomer</span>
        <span>Toucher : sélectionner</span>
      </div>

      {/* CRÉDIT DU MODÈLE */}

      <div
        style={{
          padding: "5px 12px 14px",
          textAlign: "center",
          color: "#64748B",
          fontSize: 9,
        }}
      >
        {ATTRIBUTION}
      </div>
    </div>
  );
}
