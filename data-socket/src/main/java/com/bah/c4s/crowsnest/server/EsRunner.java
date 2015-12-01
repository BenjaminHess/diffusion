/**
 * 
 */
package com.bah.c4s.crowsnest.server;

import java.io.IOException;
import java.util.Map;

import javax.websocket.Session;

import org.json.simple.JSONArray;
import org.json.simple.JSONObject;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * @author matthewisett
 *
 */
public class EsRunner {

	private static final Logger LOG = LoggerFactory.getLogger(EsRunner.class);
	private Session session;
	private JSONObject queryParams;
	
	private long returnStartTime;
	
	public EsRunner(){
		LOG.info("Ready for queries!");
	}
	
	public void search(Session session, JSONObject query) throws IOException{
		LOG.info("Perform Search!");
		this.queryParams = query;
		this.session = session;
		
		returnStartTime = System.currentTimeMillis();
		appendData(session);
		closeQuery(0,null);
	}
	
	@SuppressWarnings("unchecked")
	private void appendData(Session session) throws IOException {
		JSONObject returnJson = new JSONObject();
		// Prepare return
		returnJson.put("command", "TABLE_APPEND");
		//String dataSource = pivot.source.get("source").toString();
		returnJson.put("table", "Categories");

		JSONArray rows= new JSONArray();
		JSONObject ob = new JSONObject();
		ob.put("label", "test");
		ob.put("concept", "concept");
		ob.put("state", "MD");
		rows.add(ob);
		returnJson.put("data", rows);
		
		//Send Data
		if(session.isOpen() && rows.size() > 0) {
			String s = returnJson.toJSONString();
			//session.get
			session.getBasicRemote().sendText(returnJson.toJSONString());
		}
		
	}

	@SuppressWarnings("unchecked")
	private void closeQuery(int edges, Map<String, JSONObject> pivotMap){
		//closeScanners();
		boolean paused = false;
		int returns = 0;
		/*
		while(true){
			returns = 0;
			paused = false;
			for(Object o : pivotMap.values()){
				if(o == null){
					try {
						Thread.sleep(100);
						paused = true;
						break;
					} catch (InterruptedException e) {
						// TODO Auto-generated catch block
						e.printStackTrace();
					}
				}
			}
			if(paused == false){
				break; 
			}
		}
		*/
		//TODO: Send summary here

		JSONObject returnJson = new JSONObject();
		// Prepare return
		returnJson.put("command", "CLOSE_QUERY");
		//returnJson.put("table", source.get("source").toString());
		returnJson.put("table", "Categories");
		
		returnJson.put("data", "'label':'test'");
		
		LOG.info("Edges: " + edges);
		LOG.info("Returned: " + returns);
		LOG.info("Percent: " + (double)((double)returns/(double)edges));

		returnJson.put("runTime", System.currentTimeMillis() - returnStartTime);
		LOG.info("Millseconds Run: " + (System.currentTimeMillis() - returnStartTime));
		session.getAsyncRemote().sendText(returnJson.toJSONString());
	}

	
}
