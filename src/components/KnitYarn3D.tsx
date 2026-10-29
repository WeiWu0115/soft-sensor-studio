import {useEffect,useMemo,useRef} from 'react';
import * as THREE from 'three';
import type {KnitStructure} from '../models/knitStructure';
import {yarnInstances,yarnLoopGeometry} from '../services/knitGeometry3D';
import type {Operation} from '../services/knitPatternGenerator';
function YarnBatch({op,matrices,width,height,transparent}:{op:Operation;matrices:THREE.Matrix4[];width:number;height:number;transparent:boolean}){
 const ref=useRef<THREE.InstancedMesh>(null);
 const geometry=useMemo(()=>yarnLoopGeometry(op,width,height),[op,width,height]);
 useEffect(()=>()=>geometry.dispose(),[geometry]);
 useEffect(()=>{const mesh=ref.current;if(!mesh)return;matrices.forEach((matrix,i)=>mesh.setMatrixAt(i,matrix));mesh.instanceMatrix.needsUpdate=true;mesh.computeBoundingSphere();},[matrices]);
 return <instancedMesh ref={ref} args={[geometry,undefined,matrices.length]} raycast={()=>{}}><meshStandardMaterial color={op==='P'||op==='B'?'#9ba98d':'#d4d9c3'} roughness={.83} metalness={0} transparent={transparent} opacity={transparent?.3:1}/></instancedMesh>;
}
export function KnitYarn3D({structure,columns,rows,radius,height,transparent}:{structure:KnitStructure;columns:number;rows:number;radius:number;height:number;transparent:boolean}){
 const data=useMemo(()=>yarnInstances(structure,columns,rows,radius,height),[structure,columns,rows,radius,height]);
 return <group>{[...data.groups].map(([op,matrices])=><YarnBatch key={op} op={op} matrices={matrices} width={data.width} height={data.courseHeight} transparent={transparent}/>)}</group>;
}
