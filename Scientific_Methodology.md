# Scientific Methodology
### Mathematical Formulations, Coordinate Transformations, and Geometric Models

---

## 1. Celestial Coordinate System: The MOON_ME Frame

The application executes all celestial positions in the **Moon Mean Earth / Polar Axis body-fixed frame** (`MOON_ME`):
- **Origin:** Center of mass of the Moon.
- **Z-Axis:** Mean lunar spin axis (pointing towards the lunar North Pole).
- **X-Axis:** Intersection of the lunar equator with the mean sub-Earth direction (pointing towards the Prime Meridian at $0^\circ\text{ Lon}, 0^\circ\text{ Lat}$).
- **Y-Axis:** Completes the right-handed Cartesian coordinate system ($\hat{Y} = \hat{Z} \times \hat{X}$), pointing towards $+90^\circ\text{ East}$ longitude in Mare Tranquillitatis / Oceanus Procellarum.

---

## 2. Topocentric Parallax Derivation

The positions of celestial bodies must be evaluated from the observer's specific physical location on the lunar surface, not merely from the Moon's center. For the Sun ($d \approx 1.496 \times 10^8\text{ km}$), parallax is tiny ($< 0.001^\circ$); however, for the Earth ($d \approx 3.84 \times 10^5\text{ km}$), topocentric parallax is significant:

$$\theta_{\text{parallax}} \approx \frac{R_{\text{Moon}}}{d_{\text{Earth}}} \approx \frac{1,737.4\text{ km}}{384,400\text{ km}} \approx 0.0045\text{ rad} \approx 0.26^\circ$$

Near the lunar horizon, a $0.26^\circ$ shift can determine whether Earth is occluded by crater rims or directly in line-of-sight.

### Formulation
1. **Observer Cartesian Coordinates:** For a site with planetocentric latitude $\phi$, east-positive longitude $\lambda$, and radial elevation $h$ above the mean lunar sphere ($R_0 = 1,737.4\text{ km}$):
   $$R_{\text{site}} = R_0 + \frac{h}{1000}\text{ km}$$
   $$\vec{r}_{\text{site}} = \begin{bmatrix} R_{\text{site}} \cos\phi \cos\lambda \\ R_{\text{site}} \cos\phi \sin\lambda \\ R_{\text{site}} \sin\phi \end{bmatrix}$$

2. **Topocentric Vector Subtraction:**
   $$\vec{r}_{\text{target, topo}} = \vec{r}_{\text{target, Moon}} - \vec{r}_{\text{site}}$$

---

## 3. Local Topocentric East-North-Up (ENU) Basis

To project topocentric vectors into local horizontal coordinates (Azimuth and Elevation):

$$\hat{e} = \begin{bmatrix} -\sin\lambda \\ \cos\lambda \\ 0 \end{bmatrix}$$

$$\hat{n} = \begin{bmatrix} -\sin\phi \cos\lambda \\ -\sin\phi \sin\lambda \\ \cos\phi \end{bmatrix}$$

$$\hat{u} = \begin{bmatrix} \cos\phi \cos\lambda \\ \cos\phi \sin\lambda \\ \sin\phi \end{bmatrix}$$

For a vector $\vec{v} = \vec{r}_{\text{target, topo}}$:
$$E = \hat{e} \cdot \vec{v} = -\sin\lambda \cdot v_x + \cos\lambda \cdot v_y$$
$$N = \hat{n} \cdot \vec{v} = -\sin\phi\cos\lambda \cdot v_x - \sin\phi\sin\lambda \cdot v_y + \cos\phi \cdot v_z$$
$$U = \hat{u} \cdot \vec{v} = \cos\phi\cos\lambda \cdot v_x + \cos\phi\sin\lambda \cdot v_y + \sin\phi \cdot v_z$$

### Azimuth and Elevation Angles
- **Azimuth ($\alpha$):** Clockwise from North:
  $$\alpha = (\text{atan2}(E, N) \cdot \frac{180}{\pi} + 360) \pmod{360}$$
  - $0^\circ = \text{North}$
  - $90^\circ = \text{East}$
  - $180^\circ = \text{South}$
  - $270^\circ = \text{West}$
- **Elevation ($\beta$):** Angle above local mathematical horizontal:
  $$\beta = \text{atan2}(U, \sqrt{E^2 + N^2}) \cdot \frac{180}{\pi}$$

---

## 4. Lunar Terrain Horizon & Spherical Curvature Drop

A flat plane assumption underestimates terrain obstruction over multi-kilometer distances. The curvature drop $\Delta h$ at a distance $d$ across the Moon's spherical surface ($R_{\text{Moon}} = 1,737,400\text{ m}$) is given by:

$$\Delta h = \frac{d^2}{2 R_{\text{Moon}}}$$

For example, at $d = 20\text{ km}$, $\Delta h \approx \frac{400 \times 10^6}{3.4748 \times 10^6} \approx 115.1\text{ metres}$.

The apparent elevation angle $\theta$ of a terrain point with DEM height $h_{\text{terrain}}$ sampled from an observer at height $h_{\text{observer}}$ with optional mast height $h_{\text{mast}}$ is:

$$\theta = \arctan\left(\frac{h_{\text{terrain}} - (h_{\text{observer}} + h_{\text{mast}}) - \Delta h}{d}\right)$$

The horizon angle $H(\alpha)$ is the maximum $\theta$ encountered along each of the 360 compass azimuth bearings out to the maximum ray distance (35 km).

---

## 5. Solar Disk & Earth Line-of-Sight Determination

### Solar Visibility
The Sun subtends an angular diameter of $\approx 0.533^\circ$ (semi-diameter $R_\odot \approx 0.266^\circ$). Let $\Delta_\odot = \beta_\odot - H(\alpha_\odot)$ be the clearance above the local terrain horizon:
- **Full Solar Disk Visible:** $\Delta_\odot \ge +0.266^\circ$
- **Partial Solar Disk Visible:** $-0.266^\circ < \Delta_\odot < +0.266^\circ$
- **Occulted (Blocked):** $\Delta_\odot \le -0.266^\circ$

### Earth Line-of-Sight
Evaluated strictly as **geometric line-of-sight visibility**:
- **Line-of-Sight Open:** $\beta_\oplus > H(\alpha_\oplus)$
- **Obstructed by Terrain:** $\beta_\oplus \le H(\alpha_\oplus)$

*Operational Caveat:* Geometric visibility is a necessary, but not sufficient, condition for radio communications. Link closure depends on antenna gains, RF frequency band, transmission power, thermal noise, and ground-station tracking geometries.
