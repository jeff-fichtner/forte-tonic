// ES module for checking the HTML structure
import http from 'http';

http.get('http://localhost:3000', (res) => {
  let data = '';
  
  // A chunk of data has been received
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  // The whole response has been received
  res.on('end', () => {
    console.log('HTML response received, analyzing structure...');
    
    // Check if login button is hidden
    const loginButtonHidden = data.includes('id="login-button-container" hidden');
    console.log(`Login button has hidden attribute: ${loginButtonHidden}`);
    
    // Check if tabs container exists
    const tabsExist = data.includes('<ul class="tabs">');
    console.log(`Tabs container exists: ${tabsExist}`);
    
    // Check if individual tabs are hidden
    const tabsHidden = data.includes('hidden class="tab');
    console.log(`Individual tabs have hidden attribute: ${tabsHidden}`);
    
    // Check page content
    const pageContentHidden = data.includes('hidden id="page-content"');
    console.log(`Page content has hidden attribute: ${pageContentHidden}`);
    
    // Check loading container
    const loadingContainerExists = data.includes('id="page-loading-container"');
    console.log(`Loading container exists: ${loadingContainerExists}`);
    
    console.log('Analysis complete!');
  });
}).on('error', (err) => {
  console.error(`Error: ${err.message}`);
});
