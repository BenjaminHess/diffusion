package com.bah.c4s.crowsnest.server;

import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.LinkedList;
import java.util.List;
import java.util.Properties;
import java.util.Map.Entry;
import java.util.concurrent.TimeUnit;

import org.apache.accumulo.core.client.AccumuloException;
import org.apache.accumulo.core.client.AccumuloSecurityException;
import org.apache.accumulo.core.client.BatchScanner;
import org.apache.accumulo.core.client.BatchWriter;
import org.apache.accumulo.core.client.BatchWriterConfig;
import org.apache.accumulo.core.client.Connector;
import org.apache.accumulo.core.client.Instance;
import org.apache.accumulo.core.client.MutationsRejectedException;
import org.apache.accumulo.core.client.TableNotFoundException;
import org.apache.accumulo.core.client.ZooKeeperInstance;
import org.apache.accumulo.core.client.security.tokens.PasswordToken;
import org.apache.accumulo.core.data.Key;
import org.apache.accumulo.core.data.Mutation;
import org.apache.accumulo.core.data.Range;
import org.apache.accumulo.core.data.Value;
import org.apache.accumulo.core.security.Authorizations;
import org.apache.accumulo.core.security.ColumnVisibility;
import org.json.simple.JSONObject;

import com.bah.c4s.utils.Utilities;

public class AlertRunner {
	private final String HDFS_PROPS = "hdfs.properties";
	private final String INSTANCE_NAME = "accumuloInstanceName";
	private final String ZK = "accumulozkServerNames";
	private final String USER = "accumuloUser";
	private final String PASSWORD = "accumuloPassword";
	private final String VISIBLITY = "visibility";
	private String instanceName;
	private String zkServerNames;
	private String user;
	private String password;
	private Instance inst;
	private Connector conn;

	private final String ALERTTABLE = "Alerts";

	private final long MAX_MEM = 10000L;
	private final long MAX_LATENCY = 1000L;
	private final int MAX_WRITE_THREADS = 1;

	private BatchWriter alertWriter;
	private BatchScanner alertScanner;
	private String visibility;

	public AlertRunner() throws AccumuloException, AccumuloSecurityException {
		Properties props = Utilities.getConfig(HDFS_PROPS);
		instanceName = props.getProperty(INSTANCE_NAME);
		zkServerNames = props.getProperty(ZK);
		user = props.getProperty(USER);
		password = props.getProperty(PASSWORD);
		visibility = props.getProperty(VISIBLITY);
		
		inst = new ZooKeeperInstance(instanceName, zkServerNames);
		conn = inst.getConnector(user, new PasswordToken(password));
		Authorizations auth = new Authorizations(this.visibility);
		
		BatchWriterConfig config = new BatchWriterConfig();
		config.setMaxMemory(MAX_MEM);
		config.setMaxLatency(MAX_LATENCY, TimeUnit.MILLISECONDS);
		config.setMaxWriteThreads(MAX_WRITE_THREADS);

		try {
			alertWriter = conn.createBatchWriter(ALERTTABLE, config);
			alertScanner = conn.createBatchScanner(ALERTTABLE,auth, 1);
		} catch (TableNotFoundException e) {
			// TODO Auto-generated catch block
			e.printStackTrace();
		}
	}

	public void save(JSONObject json) {
		try {
			ColumnVisibility colVis = new ColumnVisibility(visibility);
			String author = json.get("Author").toString();
			String eventID = json.get("EventID").toString();
			String text = json.get("Text").toString();

			// create comment row id
			long time = System.currentTimeMillis();
			String commentID = "COMMENT_" 
					+ eventID.substring(0, eventID.indexOf("_")) + "_"
					+ new SimpleDateFormat("yyyyMMdd").format(new Date()) + "_"
					+ author + "_" 	+ time;

			// save comment id to Event table				
			Mutation eventMutation = new Mutation(eventID);
			eventMutation.put("comment", commentID, colVis, commentID);	
			alertWriter.addMutation(eventMutation);

			//Save the comment
			Mutation commentMutation = new Mutation(commentID);
			commentMutation.put("Author", "", colVis, author);				
			commentMutation.put("Text", "",  colVis, text);
			commentMutation.put("Time",  "",  colVis, Long.toString(time));
			commentMutation.put("EventID", "", colVis, eventID);
			
			alertWriter.addMutation(commentMutation);

		} catch (MutationsRejectedException e) {
			e.printStackTrace();
		}
	}
	
	public void delete(JSONObject params){
		String alertID = params.get("AlertID").toString();
		List<Range> commentRange = new LinkedList<Range>();
		commentRange.add(new Range(alertID));
		alertScanner.setRanges(commentRange);
		Mutation deleteComment = new Mutation(alertID);
		for (Entry<Key, Value> entry : alertScanner) {
			deleteComment.putDelete(entry.getKey().getColumnFamily(),entry.getKey().getColumnQualifier());
		}
		
		try{
		 alertWriter.addMutation(deleteComment);
		}
		catch(MutationsRejectedException e){
			//TODO: Send error report
		}
	}
}