/** The add-on's model, animation and particle files for the 3D view (loaded with the 3D scene only). */
import tableTextureUrl from '$repo/Enchant_Table_RP/arucube/enchant_table/resources/blocks/enchant_table_plus.png';
import sphereTextureUrl from '$repo/Enchant_Table_RP/arucube/enchant_table/resources/entity/enchant_sphere.png';
import glowTextureUrl from '$repo/Enchant_Table_RP/textures/particle/enchant_sphere_glow.png';
import tableGeoText from '$repo/Enchant_Table_RP/models/blocks/enchant_table_plus.geo.json?raw';
import sphereGeoText from '$repo/Enchant_Table_RP/models/entity/enchant_sphere.geo.json?raw';
import sphereAnimText from '$repo/Enchant_Table_RP/animations/enchant_sphere.animation.json?raw';
import particleText from '$repo/Enchant_Table_RP/particles/enchant_sphere.particle.json?raw';

export const models = {
	tableGeo: tableGeoText,
	sphereGeo: sphereGeoText,
	sphereAnim: sphereAnimText,
	particle: particleText,
	tableTexture: tableTextureUrl,
	sphereTexture: sphereTextureUrl,
	glowTexture: glowTextureUrl
};
