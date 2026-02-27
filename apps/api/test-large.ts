import axios from 'axios';

async function test() {
    const largeString = 'data:image/jpeg;base64,' + 'A'.repeat(2 * 1024 * 1024);
    try {
        const res = await axios.post('http://localhost:8001/api/taller-r1/salidas/69ccc499/detalles', {
            id_equipo: 'f88c42c3',
            id_equipo_ubicacion: '60ca51de',
            tipo_salida: 'Embarque',
            serial_equipos: '550-18-B39579',
            id_ubicacion: 'bdd608bc',
            id_sub_ubicacion: '84698f5e',
            foto_llave: largeString
        });
        console.log('Success!', res.status);
    } catch (e: any) {
        if (e.response) {
            console.log('Error status:', e.response.status);
            console.log('Error data:', JSON.stringify(e.response.data, null, 2));
        } else {
            console.log('Error:', e.message);
        }
    }
}
test();
