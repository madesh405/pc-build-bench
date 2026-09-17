export const components=[
{id:'cpu1',category:'CPU',name:'AMD Ryzen 5 7600',brand:'AMD',price:18999,specs:{socket:'AM5',cores:6,threads:12,boostClock:'5.1 GHz',tdp:'65 W',performanceScore:72},power:65},
{id:'cpu2',category:'CPU',name:'AMD Ryzen 7 7700',brand:'AMD',price:28999,specs:{socket:'AM5',cores:8,threads:16,boostClock:'5.3 GHz',tdp:'65 W',performanceScore:88},power:65},
{id:'cpu3',category:'CPU',name:'Intel Core i5-14400F',brand:'Intel',price:19999,specs:{socket:'LGA1700',cores:10,threads:16,boostClock:'4.7 GHz',tdp:'65 W',performanceScore:78},power:65},
{id:'mb1',category:'Motherboard',name:'MSI PRO B650M-A WiFi',brand:'MSI',price:16999,specs:{socket:'AM5',chipset:'B650',ramType:'DDR5',ramSlots:4,maxRam:'128 GB',formFactor:'mATX',maxPcieGeneration:'4.0'}},
{id:'mb2',category:'Motherboard',name:'Gigabyte B650 Eagle AX',brand:'Gigabyte',price:18999,specs:{socket:'AM5',chipset:'B650',ramType:'DDR5',ramSlots:4,maxRam:'192 GB',formFactor:'ATX',maxPcieGeneration:'5.0'}},
{id:'mb3',category:'Motherboard',name:'ASUS PRIME B760M-A',brand:'ASUS',price:14999,specs:{socket:'LGA1700',chipset:'B760',ramType:'DDR5',ramSlots:4,maxRam:'128 GB',formFactor:'mATX',maxPcieGeneration:'4.0'}},
{id:'ram1',category:'RAM',name:'Kingston Fury Beast 16GB DDR5-5600',brand:'Kingston',price:4499,specs:{capacity:'16 GB',type:'DDR5',speed:'5600 MT/s'}},
{id:'ram2',category:'RAM',name:'Corsair Vengeance 32GB DDR5-6000',brand:'Corsair',price:8999,specs:{capacity:'32 GB',type:'DDR5',speed:'6000 MT/s'}},
{id:'ram3',category:'RAM',name:'G.Skill Ripjaws 64GB DDR5-6000',brand:'G.Skill',price:16999,specs:{capacity:'64 GB',type:'DDR5',speed:'6000 MT/s'}},
{id:'gpu1',category:'GPU',name:'NVIDIA GeForce RTX 4060 8GB',brand:'NVIDIA',price:29999,specs:{vram:'8 GB',power:'115 W',length:'245 mm',performanceScore:74}},
{id:'gpu2',category:'GPU',name:'NVIDIA GeForce RTX 4070 12GB',brand:'NVIDIA',price:54999,specs:{vram:'12 GB',power:'200 W',length:'300 mm',performanceScore:94}},
{id:'gpu3',category:'GPU',name:'AMD Radeon RX 7600 8GB',brand:'AMD',price:26999,specs:{vram:'8 GB',power:'165 W',length:'240 mm',performanceScore:72}},
{id:'st1',category:'Storage',name:'WD Black SN770 1TB NVMe',brand:'WD',price:6499,specs:{type:'NVMe SSD',capacity:'1 TB',interface:'PCIe 4.0'}},
{id:'st2',category:'Storage',name:'Samsung 990 EVO 2TB NVMe',brand:'Samsung',price:11999,specs:{type:'NVMe SSD',capacity:'2 TB',interface:'PCIe 4.0/5.0'}},
{id:'psu1',category:'PSU',name:'Corsair CX650 650W 80+ Bronze',brand:'Corsair',price:5499,specs:{wattage:'650 W',efficiency:'80+ Bronze'}},
{id:'psu2',category:'PSU',name:'Corsair RM750e 750W 80+ Gold',brand:'Corsair',price:8999,specs:{wattage:'750 W',efficiency:'80+ Gold'}},
{id:'psu3',category:'PSU',name:'Corsair RM850e 850W 80+ Gold',brand:'Corsair',price:10499,specs:{wattage:'850 W',efficiency:'80+ Gold'}},
{id:'case1',category:'Case',name:'DeepCool CH370',brand:'DeepCool',price:5499,specs:{formFactor:'mATX',gpuClearance:'320 mm',maxCoolerHeight:'165 mm'}},
{id:'case2',category:'Case',name:'NZXT H5 Flow',brand:'NZXT',price:7499,specs:{formFactor:'ATX',gpuClearance:'365 mm',maxCoolerHeight:'165 mm'}},
{id:'case3',category:'Case',name:'Compact Airflow Case 240',brand:'Demo',price:3999,specs:{formFactor:'mATX',gpuClearance:'235 mm',maxCoolerHeight:'155 mm'}}];
export const workloads={Gaming:{description:'High-frame-rate gaming and GPU-heavy workloads.',gpu:1,cpu:.85,ram:.6,storage:.55},Programming:{description:'Compilers, IDEs, containers and development tools.',gpu:.3,cpu:1,ram:.9,storage:.7},Office:{description:'Documents, browsing, meetings and general productivity.',gpu:.2,cpu:.45,ram:.5,storage:.45},'Video Editing':{description:'Timeline editing, rendering and media storage.',gpu:.9,cpu:.95,ram:.95,storage:1},'AI/ML':{description:'Local model experimentation and accelerated compute.',gpu:1,cpu:.8,ram:.95,storage:.9}};
export const defaultReqs={Performance:5,Budget:4,Upgradeability:5,'Power Efficiency':3,'Thermal/Noise':3,'Storage':3};
export const qfdRelationships={technical:[{name:'CPU Performance',short:'CPU'},{name:'GPU Performance',short:'GPU'},{name:'RAM Capacity',short:'RAM'},{name:'Storage Capacity',short:'SSD'},{name:'PSU Headroom',short:'PSU'},{name:'Thermal Capability',short:'THERM'},{name:'Motherboard Upgradeability',short:'UPG'},{name:'Budget Efficiency',short:'BUD'}],users:Object.keys(defaultReqs),matrix:{Performance:[9,9,3,1,1,3,3,3],Budget:[3,3,3,3,3,3,3,9],Upgradeability:[3,3,9,3,9,3,9,3],'Power Efficiency':[3,3,3,3,9,9,3,3],'Thermal/Noise':[3,3,3,1,3,9,3,1],Storage:[1,1,3,9,1,1,3,3]}};
