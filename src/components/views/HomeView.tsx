import { useState, useEffect, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Text, Line } from "@react-three/drei";
import { supabase } from "@/integrations/supabase/client";
import * as THREE from "three";
import { useToast } from "@/hooks/use-toast";

interface Technique {
  id: string;
  name: string;
  tradition: string;
  tags: string[];
  mastery?: number;
}

interface StarProps {
  position: [number, number, number];
  technique: Technique;
  isSelected: boolean;
  onClick: () => void;
}

function Star({ position, technique, isSelected, onClick }: StarProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);

  const mastery = technique.mastery || 0;
  
  // Color progression based on mastery
  const getStarColor = () => {
    if (mastery < 33) return new THREE.Color(0.7, 0.4, 0.9); // Purple
    if (mastery < 66) return new THREE.Color(0.4, 0.6, 1.0); // Blue
    return new THREE.Color(0.95, 0.95, 1.0); // White
  };

  const starColor = getStarColor();
  const intensity = 0.3 + (mastery / 100) * 0.7;

  useFrame((state) => {
    if (meshRef.current) {
      // Gentle pulse based on mastery
      const pulse = Math.sin(state.clock.elapsedTime * 2) * 0.1 * (mastery / 100);
      meshRef.current.scale.setScalar(1 + pulse);
    }
    if (glowRef.current) {
      glowRef.current.rotation.z = state.clock.elapsedTime * 0.5;
    }
  });

  return (
    <group position={position} onClick={onClick}>
      {/* Main star */}
      <mesh ref={meshRef}>
        <sphereGeometry args={[0.3, 16, 16]} />
        <meshBasicMaterial color={starColor} />
      </mesh>

      {/* Glow effect */}
      <mesh ref={glowRef} scale={1.5}>
        <sphereGeometry args={[0.4, 16, 16]} />
        <meshBasicMaterial
          color={starColor}
          transparent
          opacity={intensity * 0.3}
        />
      </mesh>

      {/* Selection indicator */}
      {isSelected && (
        <mesh scale={2}>
          <ringGeometry args={[0.5, 0.6, 32]} />
          <meshBasicMaterial color={starColor} side={THREE.DoubleSide} />
        </mesh>
      )}

      {/* Label */}
      <Text
        position={[0, -0.8, 0]}
        fontSize={0.3}
        color={starColor.getHex()}
        anchorX="center"
        anchorY="middle"
      >
        {technique.name}
      </Text>
    </group>
  );
}

function ConnectionLines({ techniques }: { techniques: Technique[] }) {
  // Group techniques by shared tags
  const connections: [number, number][] = [];
  
  for (let i = 0; i < techniques.length; i++) {
    for (let j = i + 1; j < techniques.length; j++) {
      const sharedTags = techniques[i].tags?.filter(tag => 
        techniques[j].tags?.includes(tag)
      );
      if (sharedTags && sharedTags.length > 0) {
        connections.push([i, j]);
      }
    }
  }

  return (
    <>
      {connections.map(([i, j], idx) => {
        const start = calculatePosition(i, techniques.length);
        const end = calculatePosition(j, techniques.length);
        
        return (
          <Line
            key={`connection-${idx}`}
            points={[start, end]}
            color="#4a5568"
            opacity={0.3}
            transparent
            lineWidth={1}
          />
        );
      })}
    </>
  );
}

function calculatePosition(index: number, total: number): [number, number, number] {
  // Distribute stars in a sphere
  const phi = Math.acos(-1 + (2 * index) / total);
  const theta = Math.sqrt(total * Math.PI) * phi;
  const radius = 8;
  
  return [
    radius * Math.cos(theta) * Math.sin(phi),
    radius * Math.sin(theta) * Math.sin(phi),
    radius * Math.cos(phi),
  ];
}

function CameraController({ selectedIndex }: { selectedIndex: number | null }) {
  const { camera } = useThree();
  
  useEffect(() => {
    if (selectedIndex !== null) {
      const targetPos = calculatePosition(selectedIndex, 10); // Adjust based on total
      camera.position.lerp(new THREE.Vector3(...targetPos).multiplyScalar(0.5), 0.1);
      camera.lookAt(0, 0, 0);
    }
  }, [selectedIndex, camera]);

  return null;
}

export function HomeView() {
  const [techniques, setTechniques] = useState<Technique[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchTechniques();
  }, []);

  const fetchTechniques = async () => {
    try {
      const { data: techniquesData, error: techError } = await supabase
        .from("techniques")
        .select("*");

      if (techError) throw techError;

      const { data: masteryData } = await supabase
        .from("mastery_scores")
        .select("technique_id, mastery_score");

      const masteryMap = new Map(
        masteryData?.map((m) => [m.technique_id, m.mastery_score]) || []
      );

      const techniquesWithMastery = (techniquesData || []).map((t) => ({
        ...t,
        mastery: masteryMap.get(t.id) || 0,
      }));

      setTechniques(techniquesWithMastery);
    } catch (error: any) {
      toast({
        title: "Error loading constellation",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Loading constellation...</p>
      </div>
    );
  }

  if (techniques.length === 0) {
    return (
      <div className="h-screen flex items-center justify-center bg-background pb-24 px-4">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Your Constellation Awaits</h2>
          <p className="text-muted-foreground">
            Add techniques to see them appear as stars in your practice constellation.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-background pb-20">
      <div className="absolute top-4 left-4 z-10 bg-card/80 backdrop-blur-sm rounded-lg p-3 max-w-xs">
        <h2 className="font-bold text-sm mb-1">
          {selectedIndex !== null
            ? techniques[selectedIndex].name
            : "Navigate Your Practice"}
        </h2>
        <p className="text-xs text-muted-foreground">
          {selectedIndex !== null
            ? `${techniques[selectedIndex].mastery?.toFixed(0) || 0}% mastery`
            : "Drag to explore • Click stars to focus"}
        </p>
      </div>

      <Canvas camera={{ position: [0, 0, 15], fov: 60 }}>
        <color attach="background" args={["#0a0a0f"]} />
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} intensity={1} />

        <ConnectionLines techniques={techniques} />

        {techniques.map((technique, index) => (
          <Star
            key={technique.id}
            position={calculatePosition(index, techniques.length)}
            technique={technique}
            isSelected={selectedIndex === index}
            onClick={() => setSelectedIndex(index === selectedIndex ? null : index)}
          />
        ))}

        <OrbitControls
          enableZoom={true}
          enablePan={true}
          minDistance={5}
          maxDistance={30}
        />

        <CameraController selectedIndex={selectedIndex} />
      </Canvas>
    </div>
  );
}
